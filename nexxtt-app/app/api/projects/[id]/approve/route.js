import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST — the client signs off on a project.
// Only the client owner (portal_user_id) or the direct client can approve.
// Agency members cannot approve on the client's behalf — that requires impersonation
// + a deliberate audit trail which we don't have UI for yet.
export async function POST(req, { params }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Load project via session RLS — if the caller can't see it, they can't approve it.
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, status, job_id")
    .eq("id", id)
    .single();
  if (projErr || !project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  // Only in_review projects can be approved. Anything else is a no-op error
  // so we don't accidentally short-circuit in_progress work.
  if (project.status !== "in_review") {
    return Response.json(
      { error: `Can't approve a project in status "${project.status}"` },
      { status: 409 }
    );
  }

  const admin = createAdminSupabaseClient();

  // Confirm the caller is either the client portal_user_id OR the job's direct_client_user_id.
  const { data: job } = await admin
    .from("jobs")
    .select("id, job_number, agency_id, client_id, direct_client_user_id")
    .eq("id", project.job_id)
    .single();

  let isClient = false;
  if (job?.direct_client_user_id === user.id) isClient = true;
  if (!isClient && job?.client_id) {
    const { data: client } = await admin
      .from("clients")
      .select("portal_user_id")
      .eq("id", job.client_id)
      .maybeSingle();
    if (client?.portal_user_id === user.id) isClient = true;
  }
  if (!isClient) {
    return Response.json(
      { error: "Only the client can approve this project" },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const { error: updErr } = await admin
    .from("projects")
    .update({
      status: "delivered",
      approved_at: now,
      approved_by: user.id,
      delivered_at: now,
      updated_at: now,
    })
    .eq("id", id);
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

  // Notify the agency owner(s). Skip the client themselves.
  const recipientIds = new Set();
  if (job?.agency_id) {
    const { data: members } = await admin
      .from("user_profiles")
      .select("id")
      .eq("agency_id", job.agency_id)
      .eq("role", "agency");
    for (const m of members ?? []) recipientIds.add(m.id);
  }
  recipientIds.delete(user.id);

  if (recipientIds.size > 0) {
    await admin.from("notifications").insert(
      Array.from(recipientIds).map((uid) => ({
        user_id: uid,
        type: "client_action",
        title: `✓ Client approved ${job?.job_number ?? "a project"}`,
        body: "Project has been marked delivered.",
        link: `/agency/projects/${id}`,
      }))
    );
  }

  return Response.json({ ok: true, status: "delivered" });
}
