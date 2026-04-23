import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { slugify, isValidSlug } from "@/lib/slug";

// POST /api/auth/signup/agency
// Self-service agency registration. Creates the auth user, agencies row
// (status=pending — admin must approve), and agency_brands row with defaults.
// The handle_new_user trigger inserts the matching user_profiles row from
// the auth metadata we pass (role=agency, agency_id=<new>).
//
// Returns { ok, agencyId, email } on success. The client follows up with
// signInWithPassword and then routes to /signup/agency/pending.
export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const {
    email, password,
    firstName, lastName,
    agencyName, contactPhone, website,
  } = body ?? {};

  // Validation
  if (!email || !/.+@.+\..+/.test(email)) {
    return Response.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!firstName || firstName.trim().length < 1) {
    return Response.json({ error: "First name is required" }, { status: 400 });
  }
  if (!agencyName || agencyName.trim().length < 2) {
    return Response.json({ error: "Agency name is required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  // Slug from agency name; if collision, suffix with a short random.
  let slug = slugify(agencyName);
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Could not generate a valid agency slug" }, { status: 400 });
  }
  const { data: clash } = await admin.from("agencies").select("id").eq("slug", slug).maybeSingle();
  if (clash) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // Email-already-exists check via the agencies contact email is too narrow —
  // an existing auth user is the real conflict. createUser will fail if the
  // email is taken; we surface that as a 409.
  const emailLower = email.trim().toLowerCase();

  // 1. Create the agencies row first so we can attach agency_id to the user.
  const { data: agency, error: agencyErr } = await admin
    .from("agencies")
    .insert({
      name: agencyName.trim(),
      slug,
      status: "pending",
      plan: "starter",
      contact_name: `${firstName.trim()} ${(lastName ?? "").trim()}`.trim(),
      contact_email: emailLower,
      phone: (contactPhone ?? "").trim() || null,
      website: (website ?? "").trim() || null,
    })
    .select("id, name, slug")
    .single();
  if (agencyErr) {
    return Response.json({ error: agencyErr.message }, { status: 500 });
  }

  // 2. Create the auth user with role + agency_id in metadata. The
  //    handle_new_user trigger reads these and inserts into user_profiles.
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: emailLower,
    password,
    email_confirm: true, // skip the confirm-email step in absence of SMTP
    user_metadata: {
      role: "agency",
      agency_id: agency.id,
      first_name: firstName.trim(),
      last_name: (lastName ?? "").trim() || null,
    },
  });
  if (authErr) {
    // Roll back the agency row so a retry is clean.
    await admin.from("agencies").delete().eq("id", agency.id);
    const status = /already.*registered|exists/i.test(authErr.message) ? 409 : 500;
    return Response.json({ error: authErr.message }, { status });
  }

  // 3. Default agency_brands row — agency can edit later in Brand Settings.
  await admin.from("agency_brands").insert({
    agency_id: agency.id,
    display_name: agency.name,
    primary_colour: "#0B1F3A",
    accent_colour: "#00B8A9",
    portal_slug: slug,
    support_email: emailLower,
    sign_off_name: `${firstName.trim()} ${(lastName ?? "").trim()}`.trim(),
  });

  // 4. Notify all admins so they can approve the new agency.
  const { data: admins } = await admin.from("user_profiles").select("id").eq("role", "admin");
  if (admins?.length) {
    await admin.from("notifications").insert(
      admins.map((a) => ({
        user_id: a.id,
        type: "system",
        title: `New agency awaiting approval`,
        body: `${agency.name} · ${emailLower}`,
        link: "/admin/agencies",
      }))
    );
  }

  return Response.json({
    ok: true,
    agencyId: agency.id,
    userId: authData.user.id,
    email: emailLower,
  }, { status: 201 });
}
