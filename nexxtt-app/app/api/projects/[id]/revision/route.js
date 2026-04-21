import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST — client requests a revision. Body: { note: string }
// status → "revision_requested", revision_count ++, notifies the agency.
export async function POST(req, { params }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const note = (body?.note ?? "").trim();
  if (note.length < 5) {
    return Response.json(
      { error: "A short note is required (at least 5 characters)" },
      { status: 400 }
    );
  }

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, status, job_id, revision_count")
    .eq("id", id)
    .single();
  if (projErr || !project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  if (!["in_review", "delivered"].includes(project.status)) {
    return Response.json(
      { error: `Can't request a revision on a project in status "${project.status}"` },
      { status: 409 }
    );
  }

  const admin = createAdminSupabaseClient();

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
      { error: "Only the client can request revisions" },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const { error: updErr } = await admin
    .from("projects")
    .update({
      status: "revision_requested",
      revision_count: (project.revision_count ?? 0) + 1,
      updated_at: now,
    })
    .eq("id", id);
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

  // Log + notify agency with the reason so they have context.
  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "client_revision_request",
    target_type: "project",
    target_id: id,
    metadata: { note, job_number: job?.job_number, requested_at: now },
  });

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
        title: `↻ Revision requested on ${job?.job_number ?? "a project"}`,
        body: note.slice(0, 140),
        link: `/agency/projects/${id}`,
      }))
    );
  }

  return Response.json({
    ok: true,
    status: "revision_requested",
    revision_count: (project.revision_count ?? 0) + 1,
  });
}
