import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { isValidSlug } from "@/lib/slug";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();
  if (!profile?.agency_id || !["agency", "admin"].includes(profile.role)) {
    return Response.json({ error: "Agency account required" }, { status: 403 });
  }
  const agencyId = profile.agency_id;

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const {
    display_name, logo_url, primary_colour, accent_colour, portal_slug,
    support_email, sign_off_name, default_invite_message,
  } = body ?? {};

  // Validate
  if (!display_name || display_name.trim().length < 2) {
    return Response.json({ error: "Display name is required" }, { status: 400 });
  }
  if (!HEX_RE.test(primary_colour ?? "") || !HEX_RE.test(accent_colour ?? "")) {
    return Response.json({ error: "Colours must be 6-digit hex" }, { status: 400 });
  }
  if (!isValidSlug(portal_slug ?? "")) {
    return Response.json({ error: "Invalid portal slug" }, { status: 400 });
  }
  if (support_email && !/.+@.+\..+/.test(support_email)) {
    return Response.json({ error: "Invalid support email" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  // Slug uniqueness across agencies (agency_brands.portal_slug is UNIQUE).
  const { data: slugClash } = await admin
    .from("agency_brands")
    .select("agency_id")
    .eq("portal_slug", portal_slug)
    .neq("agency_id", agencyId)
    .maybeSingle();
  if (slugClash) {
    return Response.json(
      { error: `Portal slug "${portal_slug}" is already taken by another agency.` },
      { status: 409 }
    );
  }

  const { data: existing } = await admin
    .from("agency_brands")
    .select("agency_id")
    .eq("agency_id", agencyId)
    .maybeSingle();

  const payload = {
    agency_id: agencyId,
    display_name: display_name.trim(),
    logo_url: (logo_url ?? "").trim() || null,
    primary_colour,
    accent_colour,
    portal_slug,
    support_email: (support_email ?? "").trim() || "noreply@nexxtt.io",
    sign_off_name: (sign_off_name ?? "").trim() || display_name.trim(),
    default_invite_message: (default_invite_message ?? "").trim() || null,
  };

  if (existing) {
    const { error } = await admin.from("agency_brands").update(payload).eq("agency_id", agencyId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await admin.from("agency_brands").insert(payload);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
