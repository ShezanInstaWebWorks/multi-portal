import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST /api/admin/jobs/[id]/confirm
// Admin confirms a pending_admin_approval order → activates it to brief_pending.
// Projects move to brief_pending so the agency / admin can start work.
export async function POST(req, { params }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();

  const { data: job } = await admin
    .from("jobs")
    .select("id, job_number, status, agency_id, client_id, placed_by, total_cost_cents, total_retail_cents")
    .eq("id", id)
    .single();

  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "pending_admin_approval") {
    return Response.json(
      { error: `Job is already in status "${job.status}" — only pending_admin_approval jobs can be confirmed` },
      { status: 409 }
    );
  }

  // Activate the job and all its projects.
  const now = new Date().toISOString();

  const [jobUpdate, projectsUpdate] = await Promise.all([
    admin
      .from("jobs")
      .update({ status: "brief_pending" })
      .eq("id", id),
    admin
      .from("projects")
      .update({ status: "brief_pending", updated_at: now })
      .eq("job_id", id)
      .eq("status", "pending_admin_approval"),
  ]);

  if (jobUpdate.error) {
    return Response.json({ error: jobUpdate.error.message }, { status: 500 });
  }
  if (projectsUpdate.error) {
    return Response.json({ error: projectsUpdate.error.message }, { status: 500 });
  }

  // Notify the agency member who placed the order.
  const recipientIds = new Set();
  if (job.placed_by) recipientIds.add(job.placed_by);

  // Also notify other agency members.
  if (job.agency_id) {
    const { data: members } = await admin
      .from("user_profiles")
      .select("id")
      .eq("agency_id", job.agency_id)
      .eq("role", "agency");
    for (const m of members ?? []) recipientIds.add(m.id);
  }

  if (recipientIds.size > 0) {
    await admin.from("notifications").insert(
      Array.from(recipientIds).map((uid) => ({
        user_id: uid,
        type: "order_update",
        title: `✅ Order ${job.job_number} confirmed — work is starting`,
        body: "Your order has been approved by the admin. Production is now underway.",
        link: `/agency/orders/${job.id}`,
      }))
    );
  }

  return Response.json({ ok: true, status: "brief_pending" });
}
