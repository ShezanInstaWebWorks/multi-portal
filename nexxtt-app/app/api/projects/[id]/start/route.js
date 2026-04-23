import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST — agency or admin marks a project as "in_progress" (work has started).
// Allowed transition: brief_pending → in_progress.
// Body: { startDate: "YYYY-MM-DD", dueDate: "YYYY-MM-DD" } — both required so
// the team has a clear timeline before kicking off.
// Anything else returns 409 to keep the lifecycle clean.
export async function POST(req, { params }) {
  const { id } = await params;

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

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const startDate = typeof body?.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate) ? body.startDate : null;
  const dueDate   = typeof body?.dueDate   === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)   ? body.dueDate   : null;
  if (!startDate || !dueDate) {
    return Response.json(
      { error: "Start date and due date are required before starting work", code: "DATES_REQUIRED" },
      { status: 400 }
    );
  }
  if (startDate > dueDate) {
    return Response.json(
      { error: "Start date must be on or before due date", code: "DATES_INVALID" },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, status, job_id")
    .eq("id", id)
    .single();
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  if (project.status !== "brief_pending") {
    return Response.json(
      { error: `Can't start a project in status "${project.status}"` },
      { status: 409 }
    );
  }

  // Agency members must own the project's job. Admins skip this check.
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

  const now = new Date().toISOString();
  const { error: updErr } = await admin
    .from("projects")
    .update({
      status: "in_progress",
      start_date: startDate,
      due_date: dueDate,
      updated_at: now,
    })
    .eq("id", id);
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

  // Notify the client so they know work has started.
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
        title: `▶ Work started on ${job?.job_number ?? "your project"}`,
        body: "Our team has picked up your brief.",
        link: null,
      }))
    );
  }

  return Response.json({ ok: true, status: "in_progress" });
}
