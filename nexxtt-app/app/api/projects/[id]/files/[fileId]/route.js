import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * DELETE — agency/admin removes a deliverable (mistake upload, wrong file).
 * Removes the Storage object AND the delivered_files row.
 */
export async function DELETE(req, { params }) {
  const { id, fileId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();
  if (!profile || !["agency", "admin"].includes(profile.role)) {
    return Response.json({ error: "Agency or admin only" }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: row } = await admin
    .from("delivered_files")
    .select("id, project_id, storage_path")
    .eq("id", fileId)
    .eq("project_id", id)
    .maybeSingle();
  if (!row) return Response.json({ error: "File not found" }, { status: 404 });

  // Agency: verify the project belongs to them.
  if (profile.role === "agency") {
    const { data: project } = await admin
      .from("projects").select("job_id").eq("id", row.project_id).single();
    if (project) {
      const { data: job } = await admin
        .from("jobs").select("agency_id").eq("id", project.job_id).single();
      if (job?.agency_id !== profile.agency_id) {
        return Response.json({ error: "Not your project" }, { status: 403 });
      }
    }
  }

  await admin.storage.from("delivered-files").remove([row.storage_path]);
  await admin.from("delivered_files").delete().eq("id", fileId);

  return Response.json({ ok: true });
}
