import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file

/**
 * GET — returns the list of deliverables for a project + 24 h signed URLs.
 * The caller must be able to see the project via RLS (agency / client / admin).
 * A determined client can only read the project row, so they get signed URLs
 * for files attached to THEIR project, nothing else.
 */
export async function GET(req, { params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // RLS gate: if the viewer can't read the project, they can't read its files.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!project) return Response.json({ files: [] });

  const admin = createAdminSupabaseClient();
  const { data: rows } = await admin
    .from("delivered_files")
    .select("id, name, storage_path, size_bytes, mime_type, uploaded_at")
    .eq("project_id", id)
    .order("uploaded_at", { ascending: false });

  const signed = await Promise.all(
    (rows ?? []).map(async (f) => {
      const { data: s } = await admin
        .storage.from("delivered-files")
        .createSignedUrl(f.storage_path, 86400); // 24 h
      return { ...f, url: s?.signedUrl ?? null };
    })
  );

  return Response.json({ files: signed });
}

/**
 * POST — agency/admin uploads a new deliverable.
 * Body: multipart/form-data with a 'file' field.
 */
export async function POST(req, { params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Only agency/admin can upload deliverables.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();
  if (!profile || !["agency", "admin"].includes(profile.role)) {
    return Response.json({ error: "Agency or admin only" }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();

  // Verify the project belongs to the uploader's agency (admins skip this check).
  const { data: project } = await admin
    .from("projects")
    .select("id, job_id")
    .eq("id", id)
    .single();
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  if (profile.role === "agency") {
    const { data: job } = await admin
      .from("jobs")
      .select("agency_id")
      .eq("id", project.job_id)
      .single();
    if (job?.agency_id !== profile.agency_id) {
      return Response.json({ error: "Not your project" }, { status: 403 });
    }
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: `File must be ${MAX_BYTES / 1024 / 1024} MB or smaller` }, { status: 400 });
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${id}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from("delivered-files")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });

  const { data: row, error: rowErr } = await admin
    .from("delivered_files")
    .insert({
      project_id: id,
      name: file.name,
      storage_path: storagePath,
      size_bytes: file.size,
      mime_type: file.type || null,
    })
    .select("id, name, storage_path, size_bytes, mime_type, uploaded_at")
    .single();

  if (rowErr) {
    // Clean up the uploaded object — no row to point at it.
    await admin.storage.from("delivered-files").remove([storagePath]);
    return Response.json({ error: rowErr.message }, { status: 500 });
  }

  // Notify the client (agency_client via clients.portal_user_id, or direct_client)
  const { data: job } = await admin
    .from("jobs")
    .select("job_number, client_id, direct_client_user_id")
    .eq("id", project.job_id)
    .single();

  const recipientIds = new Set();
  if (job?.direct_client_user_id) recipientIds.add(job.direct_client_user_id);
  if (job?.client_id) {
    const { data: client } = await admin
      .from("clients").select("portal_user_id").eq("id", job.client_id).maybeSingle();
    if (client?.portal_user_id) recipientIds.add(client.portal_user_id);
  }
  if (recipientIds.size > 0) {
    await admin.from("notifications").insert(
      Array.from(recipientIds).map((uid) => ({
        user_id: uid,
        type: "order_update",
        title: `New deliverable ready — ${job?.job_number ?? "your project"}`,
        body: file.name,
        link: null,
      }))
    );
  }

  const { data: s } = await admin.storage
    .from("delivered-files")
    .createSignedUrl(row.storage_path, 86400);

  return Response.json({ file: { ...row, url: s?.signedUrl ?? null } }, { status: 201 });
}
