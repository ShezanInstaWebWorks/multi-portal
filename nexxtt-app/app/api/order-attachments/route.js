import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

const BUCKET = "order-attachments";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB per file

// POST — agency pre-uploads a reference file before the order is submitted.
// Returns { path, name, size, mime } which the client includes in the order payload.
export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();
  if (!["agency", "admin", "direct_client"].includes(profile?.role)) {
    return Response.json({ error: "Unauthorized role" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: `File too large — max ${MAX_BYTES / 1024 / 1024} MB` }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const prefix = profile.role === "direct_client"
    ? `direct-${user.id}`
    : `agency-${profile.agency_id}`;
  const path = `${prefix}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let upResult = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: false });

  // Auto-create the bucket on first use if it doesn't exist yet.
  if (upResult.error?.message?.toLowerCase().includes("bucket not found")) {
    await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES });
    upResult = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
  }

  if (upResult.error) return Response.json({ error: upResult.error.message }, { status: 500 });

  return Response.json({ path, name: file.name, size: file.size, mime: file.type || "application/octet-stream" }, { status: 201 });
}

// GET /api/order-attachments?path=<storage-path>
// Returns a short-lived signed download URL. Caller must be agency/admin.
export async function GET(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();
  if (!["agency", "admin", "direct_client"].includes(profile?.role)) return Response.json({ error: "No profile" }, { status: 403 });

  const path = new URL(req.url).searchParams.get("path");
  if (!path) return Response.json({ error: "path required" }, { status: 400 });

  // Agencies may only fetch files under their own prefix. Direct clients may
  // only fetch files under their own prefix.
  if (profile.role === "agency" && !path.startsWith(`agency-${profile.agency_id}/`)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (profile.role === "direct_client" && !path.startsWith(`direct-${user.id}/`)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: signed, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600, { download: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ url: signed.signedUrl });
}
