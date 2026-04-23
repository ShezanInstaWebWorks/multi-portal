import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST — client requests a revision. Body: { note: string }
// status → "revision_requested", revision_count ++, notifies the agency,
// and posts the note into the project-chat so agency + admin both see it.
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
  let senderRole = null;
  if (job?.direct_client_user_id === user.id) {
    isClient = true;
    senderRole = "direct_client";
  }
  if (!isClient && job?.client_id) {
    const { data: client } = await admin
      .from("clients")
      .select("portal_user_id")
      .eq("id", job.client_id)
      .maybeSingle();
    if (client?.portal_user_id === user.id) {
      isClient = true;
      senderRole = "agency_client";
    }
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

  // Log to audit table for the admin action history.
  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "client_revision_request",
    target_type: "project",
    target_id: id,
    metadata: { note, job_number: job?.job_number, requested_at: now },
  });

  // Post the revision note into the project chat so the agency (and admin,
  // read-only) see it in context and the agency can reply.
  const { data: existingConv } = await admin
    .from("conversations")
    .select("id")
    .eq("tier", "project")
    .eq("project_id", id)
    .maybeSingle();

  let conversationId = existingConv?.id ?? null;
  if (!conversationId) {
    const { data: created } = await admin
      .from("conversations")
      .insert({ tier: "project", project_id: id })
      .select("id")
      .single();
    conversationId = created?.id ?? null;
  }

  const chatBody = `↻ Revision requested\n\n${note}`;
  if (conversationId) {
    await admin.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_role: senderRole,
      body: chatBody,
    });
    await admin
      .from("conversations")
      .update({ last_message_at: now, last_message_preview: chatBody.slice(0, 140) })
      .eq("id", conversationId);
  }

  // Notify the agency (they drive the reply) + all admins (observers).
  // Admin recipients get a link to their own project workspace.
  const agencyRecipients = new Set();
  if (job?.agency_id) {
    const { data: members } = await admin
      .from("user_profiles")
      .select("id")
      .eq("agency_id", job.agency_id)
      .eq("role", "agency");
    for (const m of members ?? []) agencyRecipients.add(m.id);
  }
  const { data: admins } = await admin
    .from("user_profiles")
    .select("id")
    .eq("role", "admin");
  const adminRecipients = new Set((admins ?? []).map((a) => a.id));

  agencyRecipients.delete(user.id);
  adminRecipients.delete(user.id);

  const rows = [
    ...[...agencyRecipients].map((uid) => ({
      user_id: uid,
      type: "client_action",
      title: `↻ Revision requested on ${job?.job_number ?? "a project"}`,
      body: note.slice(0, 140),
      link: `/agency/projects/${id}?tab=chat`,
    })),
    ...[...adminRecipients].map((uid) => ({
      user_id: uid,
      type: "client_action",
      title: `↻ Revision requested on ${job?.job_number ?? "a project"}`,
      body: note.slice(0, 140),
      link: `/admin/projects/${id}?tab=chat`,
    })),
  ];
  if (rows.length > 0) {
    await admin.from("notifications").insert(rows);
  }

  return Response.json({
    ok: true,
    status: "revision_requested",
    revision_count: (project.revision_count ?? 0) + 1,
  });
}
