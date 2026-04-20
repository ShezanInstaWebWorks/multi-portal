import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);
const MAX_BYTES = 524288; // 500 KB

export async function POST(req) {
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

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json({ error: `Type ${file.type} not allowed` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Logo must be 500 KB or smaller" }, { status: 400 });
  }

  const ext = extFromMime(file.type);
  const key = `${agencyId}/logo-${Date.now()}.${ext}`;
  const admin = createAdminSupabaseClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from("agency-logos")
    .upload(key, buffer, { contentType: file.type, upsert: true });
  if (uploadErr) {
    return Response.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("agency-logos").getPublicUrl(key);
  const logoUrl = pub?.publicUrl;

  // Upsert agency_brands with the new logo URL (keep other fields as-is).
  const { data: existing } = await admin
    .from("agency_brands")
    .select("agency_id")
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (existing) {
    await admin.from("agency_brands").update({ logo_url: logoUrl }).eq("agency_id", agencyId);
  } else {
    // Minimum required fields for an initial insert — other defaults on the page will
    // fill in on the next Save Changes click.
    const { data: agency } = await admin.from("agencies").select("name, slug").eq("id", agencyId).single();
    await admin.from("agency_brands").insert({
      agency_id: agencyId,
      display_name: agency?.name ?? "Agency",
      portal_slug: agency?.slug ?? agencyId,
      support_email: "noreply@nexxtt.io",
      sign_off_name: agency?.name ?? "Agency",
      logo_url: logoUrl,
    });
  }

  return Response.json({ logoUrl });
}

function extFromMime(mime) {
  return { "image/png": "png", "image/jpeg": "jpg", "image/svg+xml": "svg", "image/webp": "webp" }[mime] ?? "bin";
}
