import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST — agency sends work back to admin with a revision note.
// Transition: agency_review → in_progress
// Only the agency that owns the project may call this.
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
    return Response.json({ error: "A note is required (at least 5 characters)" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "agency") {
    return Response.json({ error: "Agency accounts only" }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, status, job_id")
    .eq("id", id)
    .single();

  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  if (project.status !== "agency_review") {
    return Response.json(
      { error: `Can only request changes when status is agency_review (current: "${project.status}")` },
      { status: 409 }
    );
  }

  const { data: job } = await admin
    .from("jobs")
    .select("id, job_number, agency_id")
    .eq("id", project.job_id)
    .single();

  if (job?.agency_id !== profile.agency_id) {
    return Response.json({ error: "Not your project" }, { status: 403 });
  }

  const now = new Date().toISOString();

  const { error: updErr } = await admin
    .from("projects")
    .update({ status: "in_progress", updated_at: now })
    .eq("id", id);
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

  // Post note into the project-admin thread so admin sees it in context.
  const { data: adminConv } = await admin
    .from("conversations")
    .select("id")
    .eq("tier", "project_admin")
    .eq("project_id", id)
    .maybeSingle();

  if (adminConv?.id) {
    const chatBody = `↻ Agency requested changes\n\n${note}`;
    await admin.from("messages").insert({
      conversation_id: adminConv.id,
      sender_id: user.id,
      sender_role: "agency",
      body: chatBody,
    });
    await admin
      .from("conversations")
      .update({ last_message_at: now, last_message_preview: chatBody.slice(0, 140) })
      .eq("id", adminConv.id);
  }

  // Notify all admins.
  const { data: admins } = await admin
    .from("user_profiles")
    .select("id")
    .eq("role", "admin");

  const rows = (admins ?? []).map((a) => ({
    user_id: a.id,
    type: "client_action",
    title: `↻ Agency requested changes on ${job?.job_number ?? "a project"}`,
    body: note.slice(0, 140),
    link: `/admin/projects/${id}?tab=chat`,
  }));

  if (rows.length > 0) {
    await admin.from("notifications").insert(rows);
  }

  return Response.json({ ok: true, status: "in_progress" });
}
