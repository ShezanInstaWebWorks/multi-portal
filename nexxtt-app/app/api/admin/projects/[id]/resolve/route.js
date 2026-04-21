import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST — admin resolves a disputed project.
// Body: { action: "reopen" | "force_deliver" | "refund", note?: string }
// - reopen        → status = in_progress, revision_count + 1
// - force_deliver → status = delivered, delivered_at = now
// - refund        → logged; Stripe refund call lands in the Stripe session.
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
    return Response.json({ error: "Admin role required" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const action = body?.action;
  const note = (body?.note ?? "").trim();
  if (!["reopen", "force_deliver", "refund"].includes(action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, status, job_id, revision_count")
    .eq("id", id)
    .single();
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  if (project.status !== "disputed") {
    return Response.json({ error: "Only disputed projects can be resolved" }, { status: 409 });
  }

  let patch = { updated_at: new Date().toISOString() };
  if (action === "reopen") {
    patch.status = "in_progress";
    patch.revision_count = (project.revision_count ?? 0) + 1;
  } else if (action === "force_deliver") {
    patch.status = "delivered";
    patch.delivered_at = new Date().toISOString();
  } else if (action === "refund") {
    // Leave status as 'disputed' until the Stripe flow lands and we know whether
    // the refund cleared. Mark metadata only.
  }

  if (Object.keys(patch).length > 1) {
    await admin.from("projects").update(patch).eq("id", id);
  }

  // Audit
  await admin.from("admin_actions").insert({
    admin_id:    user.id,
    action:      `resolve_dispute_${action}`,
    target_type: "project",
    target_id:   id,
    metadata:    { action, note, resolved_at: new Date().toISOString() },
  });

  // Notify agency + client about the resolution
  const { data: job } = await admin
    .from("jobs")
    .select("agency_id, client_id, direct_client_user_id, job_number")
    .eq("id", project.job_id)
    .single();

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
  notifyUserIds.delete(user.id);

  const titleMap = {
    reopen:         `Dispute resolved on ${job?.job_number ?? "your project"}`,
    force_deliver:  `Admin delivered ${job?.job_number ?? "your project"}`,
    refund:         `Refund scheduled for ${job?.job_number ?? "a project"}`,
  };
  const rows = Array.from(notifyUserIds).map((uid) => ({
    user_id: uid,
    type:    "order_update",
    title:   titleMap[action],
    body:    note || "Admin action completed.",
    link:    null,
  }));
  if (rows.length > 0) await admin.from("notifications").insert(rows);

  return Response.json({ ok: true, action, status: patch.status ?? project.status });
}
