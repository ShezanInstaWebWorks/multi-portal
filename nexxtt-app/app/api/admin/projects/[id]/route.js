import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = new Set([
  "brief_pending", "in_progress", "in_review",
  "revision_requested", "delivered", "approved", "disputed", "cancelled",
]);

// PATCH /api/admin/projects/[id]
// Body: { status?, startDate?, dueDate?, isRush? }
// Admin-only project field updates. Stamps delivered_at / approved_at when
// the status implies that.
export async function PATCH(req, { params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in", code: "NO_SESSION" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return Response.json({ error: "Admin only", code: "FORBIDDEN" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const patch = { updated_at: new Date().toISOString() };

  if (typeof body.status === "string") {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return Response.json({ error: "Invalid status", code: "VALIDATION" }, { status: 400 });
    }
    // Starting a project requires both dates. Either they're already set,
    // or the same PATCH must include them.
    if (body.status === "in_progress") {
      const incomingStart = typeof body.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate) ? body.startDate : null;
      const incomingDue   = typeof body.dueDate   === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)   ? body.dueDate   : null;
      const { data: existing } = await admin.from("projects").select("start_date, due_date").eq("id", id).maybeSingle();
      const finalStart = incomingStart ?? existing?.start_date ?? null;
      const finalDue   = incomingDue   ?? existing?.due_date   ?? null;
      if (!finalStart || !finalDue) {
        return Response.json(
          { error: "Set a start date and due date before moving to In progress", code: "DATES_REQUIRED" },
          { status: 400 }
        );
      }
      if (finalStart > finalDue) {
        return Response.json({ error: "Start date must be on or before due date", code: "DATES_INVALID" }, { status: 400 });
      }
    }
    patch.status = body.status;
    if (body.status === "delivered") patch.delivered_at = patch.updated_at;
    if (body.status === "approved")  patch.approved_at  = patch.updated_at;
  }

  if (body.startDate === null || (typeof body.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate))) {
    patch.start_date = body.startDate;
  }
  if (body.dueDate === null || (typeof body.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate))) {
    patch.due_date = body.dueDate;
  }
  if (typeof body.isRush === "boolean") {
    patch.is_rush = body.isRush;
  }

  const { data: updated, error } = await admin
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    return Response.json({ error: error.message, code: "UPDATE_ERROR" }, { status: 500 });
  }

  return Response.json({ project: updated });
}
