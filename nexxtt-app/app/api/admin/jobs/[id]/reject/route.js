import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST /api/admin/jobs/[id]/reject
// Body: { reason?: string }
// Admin rejects a pending order → job marked rejected, balance refunded to agency.
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

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : null;

  const admin = createAdminSupabaseClient();

  const { data: job } = await admin
    .from("jobs")
    .select("id, job_number, status, agency_id, client_id, placed_by, total_cost_cents")
    .eq("id", id)
    .single();

  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "pending_admin_approval") {
    return Response.json(
      { error: `Job is already in status "${job.status}" — only pending_admin_approval jobs can be rejected` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  // Mark job and all its projects as cancelled/rejected.
  const [jobUpdate, projectsUpdate] = await Promise.all([
    admin
      .from("jobs")
      .update({ status: "rejected" })
      .eq("id", id),
    admin
      .from("projects")
      .update({ status: "cancelled", updated_at: now })
      .eq("job_id", id)
      .eq("status", "pending_admin_approval"),
  ]);

  if (jobUpdate.error) return Response.json({ error: jobUpdate.error.message }, { status: 500 });
  if (projectsUpdate.error) return Response.json({ error: projectsUpdate.error.message }, { status: 500 });

  // Refund the agency's balance.
  if (job.agency_id && job.total_cost_cents > 0) {
    const { data: refundResult } = await admin.rpc("deduct_balance", {
      p_agency_id: job.agency_id,
      p_amount: -job.total_cost_cents,
    });

    await admin.from("balance_transactions").insert({
      agency_id: job.agency_id,
      type: "credit",
      amount_cents: job.total_cost_cents,
      balance_after_cents: refundResult?.new_balance ?? 0,
      description: `Refund — Order ${job.job_number} rejected`,
      related_job_id: job.id,
    });
  }

  // Notify the agency.
  const recipientIds = new Set();
  if (job.placed_by) recipientIds.add(job.placed_by);
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
        title: `❌ Order ${job.job_number} was not approved`,
        body: reason
          ? `Reason: ${reason}. Your balance has been refunded.`
          : "Your balance has been refunded. Please contact support if you have questions.",
        link: `/agency/orders/${job.id}`,
      }))
    );
  }

  return Response.json({ ok: true, status: "rejected" });
}
