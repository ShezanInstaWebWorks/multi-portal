import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { isValidSlug, slugify } from "@/lib/slug";

export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id || !["agency", "admin"].includes(profile.role)) {
    return Response.json({ error: "Agency account required", code: "NOT_AGENCY" }, { status: 403 });
  }
  const agencyId = profile.agency_id;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "BAD_JSON" }, { status: 400 });
  }

  const {
    businessName,
    industry,
    contactName,
    contactEmail,
    phone,
    internalNote,
    portalAccessLevel,
    portalSlug,
    inviteMessage,
  } = body ?? {};

  // Validation
  if (!businessName || businessName.trim().length < 2) {
    return Response.json({ error: "Business name is required", code: "VALIDATION" }, { status: 400 });
  }
  if (!contactName || contactName.trim().length < 2) {
    return Response.json({ error: "Contact name is required", code: "VALIDATION" }, { status: 400 });
  }
  if (!contactEmail || !/.+@.+\..+/.test(contactEmail)) {
    return Response.json({ error: "Valid email is required", code: "VALIDATION" }, { status: 400 });
  }
  const slug = isValidSlug(portalSlug ?? "") ? portalSlug : slugify(businessName);
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Could not generate a valid portal slug", code: "VALIDATION" }, { status: 400 });
  }
  if (!["full", "view_and_approve"].includes(portalAccessLevel)) {
    return Response.json({ error: "Invalid access level", code: "VALIDATION" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  // Slug must be unique within this agency
  const { data: slugClash } = await admin
    .from("clients")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("portal_slug", slug)
    .maybeSingle();
  if (slugClash) {
    return Response.json(
      { error: `Portal slug "${slug}" is already in use for this agency.`, code: "SLUG_IN_USE" },
      { status: 409 }
    );
  }

  // Email uniqueness within this agency
  const { data: emailClash } = await admin
    .from("clients")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("contact_email", contactEmail.toLowerCase())
    .maybeSingle();
  if (emailClash) {
    return Response.json(
      { error: "A client with this email already exists for your agency.", code: "EMAIL_IN_USE" },
      { status: 409 }
    );
  }

  // Generate magic link for the client (creates the auth.users row for type 'invite').
  // NOTE: Resend is not yet wired, so we return the actionLink for the agency to
  // copy manually. The Supabase invite email fallback only fires if SMTP is set.
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/portal/${slug}/setup`;

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "invite",
    email: contactEmail.toLowerCase(),
    options: {
      redirectTo,
      data: {
        role: "agency_client",
        first_name: contactName.split(/\s+/)[0] ?? contactName,
        last_name: contactName.split(/\s+/).slice(1).join(" ") || null,
        agency_id: agencyId,
        invited_by: user.id,
      },
    },
  });
  if (linkErr) {
    return Response.json(
      { error: linkErr.message, code: "LINK_GEN_ERROR" },
      { status: 500 }
    );
  }
  const invitedUserId = linkData?.user?.id ?? null;
  const actionLink = linkData?.properties?.action_link ?? null;

  const now = new Date();
  const expires = new Date(Date.now() + 7 * 86400000);

  // Insert client row. We store the inviteMessage via internal_note if provided —
  // there's no dedicated column in the current schema.
  const { data: client, error: clientErr } = await admin
    .from("clients")
    .insert({
      agency_id: agencyId,
      portal_user_id: invitedUserId,
      business_name: businessName.trim(),
      contact_name: contactName.trim(),
      contact_email: contactEmail.toLowerCase(),
      phone: (phone ?? "").trim() || null,
      industry: industry ?? null,
      internal_note: (internalNote ?? "").trim() || null,
      portal_status: "invited",
      portal_access_level: portalAccessLevel,
      portal_slug: slug,
      invite_sent_at: now.toISOString(),
      invite_expires_at: expires.toISOString(),
    })
    .select("id, business_name, portal_slug, portal_status")
    .single();

  if (clientErr) {
    return Response.json(
      { error: clientErr.message, code: "CLIENT_INSERT_ERROR" },
      { status: 500 }
    );
  }

  // System notification for the inviting agency user so the bell blinks.
  await admin.from("notifications").insert({
    user_id: user.id,
    type: "system",
    title: "Client invited",
    body: `${businessName.trim()} · ${contactEmail.toLowerCase()}`,
    link: "/agency/clients",
  });

  // TODO session 25+: send branded email via Resend.  For now we return the
  // action link so the agency can copy-paste it.
  return Response.json(
    {
      client,
      actionLink,
      invitedUserId,
      emailSent: false,
      previewMessage: inviteMessage,
    },
    { status: 201 }
  );
}
