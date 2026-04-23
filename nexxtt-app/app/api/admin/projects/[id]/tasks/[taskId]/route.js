import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// PATCH /api/admin/projects/[id]/tasks/[taskId]
// Body: { title?, description?, status?, dueDate? }
export async function PATCH(req, { params }) {
  const { taskId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in", code: "NO_SESSION" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin.from("user_profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return Response.json({ error: "Admin only", code: "FORBIDDEN" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const patch = { updated_at: new Date().toISOString() };
  if (typeof body?.title === "string") patch.title = body.title.trim().slice(0, 200);
  if (typeof body?.description === "string") patch.description = body.description.trim() || null;
  if (typeof body?.status === "string" && ["todo", "doing", "review", "done"].includes(body.status)) {
    patch.status = body.status;
    patch.completed_at = body.status === "done" ? patch.updated_at : null;
  }
  if (body?.dueDate === null) patch.due_date = null;
  else if (typeof body?.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) patch.due_date = body.dueDate;

  const { data: updated, error } = await admin
    .from("project_tasks")
    .update(patch)
    .eq("id", taskId)
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message, code: "UPDATE_ERROR" }, { status: 500 });

  return Response.json({ task: updated });
}

// DELETE /api/admin/projects/[id]/tasks/[taskId]
export async function DELETE(_req, { params }) {
  const { taskId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin.from("user_profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

  const { error } = await admin.from("project_tasks").delete().eq("id", taskId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
