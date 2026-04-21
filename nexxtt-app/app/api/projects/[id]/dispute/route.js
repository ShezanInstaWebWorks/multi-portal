import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST — raise a dispute on a project.
// Any authenticated viewer who can see the project via RLS can dispute it
// (agency member, agency_client owner, direct_client owner, or admin).
export async function POST(req, { params }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const reason = (body?.reason ?? "").trim();
  if (reason.length < 5) {
    return Response.json(
      { error: "A short reason is required (at least 5 characters)" },
      { status: 400 }
    );
  }

  // RLS gate: fetch via the user's own session. If they can't see it, they
  // can't dispute it.
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, status, job_id")
    .eq("id", id)
    .single();
  if (projErr || !project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.status === "disputed") {
    return Response.json({ error: "Project is already disputed" }, { status: 409 });
  }
  if (project.status === "delivered") {
    return Response.json({ error: "Delivered projects can't be disputed" }, { status: 409 });
  }

  // Admin client for writes (projects has agency-scoped RLS but not a blanket
  // UPDATE policy; going through service-role keeps the auth surface tight).
  const admin = createAdminSupabaseClient();

  const previousStatus = project.status;
  const { error: updErr } = await admin
    .from("projects")
    .update({ status: "disputed", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

  // Resolve job so we can notify the agency owner + the client (if any).
  const { data: job } = await admin
    .from("jobs")
    .select("id, job_number, agency_id, client_id, direct_client_user_id")
    .eq("id", project.job_id)
    .single();

  // Audit entry
  await admin.from("admin_actions").insert({
    admin_id:    user.id,
    action:      "raise_dispute",
    target_type: "project",
    target_id:   id,
    metadata:    {
      reason,
      previous_status: previousStatus,
      raised_at: new Date().toISOString(),
      job_number: job?.job_number,
    },
  });

  // Notify the agency owner + direct client (if any) + all admins of the platform.
  const notifyUserIds = new Set();

  if (job?.agency_id) {
    const { data: members } = await admin
      .from("user_profiles")
      .select("id")
      .eq("agency_id", job.agency_id)
      .eq("role", "agency");
    for (const m of members ?? []) notifyUserIds.add(m.id);
  }
  if (job?.direct_client_user_id) notifyUserIds.add(job.direct_client_user_id);

  if (job?.client_id) {
    const { data: client } = await admin
      .from("clients")
      .select("portal_user_id")
      .eq("id", job.client_id)
      .maybeSingle();
    if (client?.portal_user_id) notifyUserIds.add(client.portal_user_id);
  }

  const { data: admins } = await admin
    .from("user_profiles")
    .select("id")
    .eq("role", "admin");
  for (const a of admins ?? []) notifyUserIds.add(a.id);

  notifyUserIds.delete(user.id); // no need to notify the raiser
  const rows = Array.from(notifyUserIds).map((uid) => ({
    user_id: uid,
    type:    "order_update",
    title:   `⚑ Dispute raised on ${job?.job_number ?? "a project"}`,
    body:    reason.slice(0, 120),
    link:    `/admin/orders?status=disputed`,
  }));
  if (rows.length > 0) await admin.from("notifications").insert(rows);

  return Response.json({ ok: true, projectId: id, status: "disputed" });
}
