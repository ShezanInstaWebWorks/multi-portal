import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// POST — submit a project through the review chain.
//
// Transitions handled:
//   admin       : in_progress  → agency_review  (admin submits work to agency)
//   agency      : agency_review → in_review      (agency forwards to client)
//   agency      : in_progress  → in_review       (agency-only projects, no admin step)
export async function POST(req, { params }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const note = body.note ?? "";

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();
  if (!profile || !["agency", "admin"].includes(profile.role)) {
    return Response.json({ error: "Agency or admin only" }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, status, job_id")
    .eq("id", id)
    .single();
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  // Determine the allowed transition based on role and current status.
  let nextStatus = null;
  let notifyTarget = null; // "agency" | "client"

  if (profile.role === "admin") {
    if (project.status === "in_progress") {
      nextStatus = "agency_review";
      notifyTarget = "agency";
    } else {
      return Response.json(
        { error: `Admin can only submit from in_progress (current: "${project.status}")` },
        { status: 409 }
      );
    }
  } else {
    // agency role
    if (project.status === "agency_review") {
      nextStatus = "in_review";
      notifyTarget = "client";
    } else if (project.status === "in_progress") {
      // Agency-only workflow — goes straight to client
      nextStatus = "in_review";
      notifyTarget = "client";
    } else {
      return Response.json(
        { error: `Cannot submit from status "${project.status}"` },
        { status: 409 }
      );
    }
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
    .update({ status: nextStatus, updated_at: now })
    .eq("id", id);
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

  const { data: job } = await admin
    .from("jobs")
    .select("job_number, agency_id, client_id, direct_client_user_id")
    .eq("id", project.job_id)
    .single();

  const recipientIds = new Set();

  if (notifyTarget === "agency") {
    // Notify agency members that work is ready for their review.
    if (job?.agency_id) {
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
          type: "client_action",
          title: `🔍 Review ready: ${job?.job_number ?? "a project"}`,
          body: note ? `Work submitted for your review. Note: ${note}` : "Work has been submitted for your review before forwarding to your client.",
          link: `/agency/projects/${id}`,
        }))
      );
    }
  } else {
    // Notify client that work is ready for their review.
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
          type: "client_action",
          title: `⏰ Please review: ${job?.job_number ?? "a project"}`,
          body: note ? `Project ready for review. Note: ${note}` : "Your project is ready — please approve or request changes.",
          link: null,
        }))
      );
    }
  }

  return Response.json({ ok: true, status: nextStatus });
}
