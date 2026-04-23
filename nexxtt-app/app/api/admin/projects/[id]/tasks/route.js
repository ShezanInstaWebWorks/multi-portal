import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST /api/admin/projects/[id]/tasks
// Body: { title, description?, dueDate?, status? }
export async function POST(req, { params }) {
  const { id: projectId } = await params;
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

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return Response.json({ error: "Title required", code: "VALIDATION" }, { status: 400 });

  // Compute next sort_order
  const { data: rows } = await admin
    .from("project_tasks")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = ((rows?.[0]?.sort_order ?? -1) + 1) | 0;

  const { data: inserted, error } = await admin
    .from("project_tasks")
    .insert({
      project_id: projectId,
      title: title.slice(0, 200),
      description: typeof body?.description === "string" ? body.description.trim() || null : null,
      status: ["todo", "doing", "review", "done"].includes(body?.status) ? body.status : "todo",
      due_date: typeof body?.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) ? body.dueDate : null,
      created_by: user.id,
      sort_order: nextSort,
    })
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message, code: "INSERT_ERROR" }, { status: 500 });

  return Response.json({ task: inserted }, { status: 201 });
}
