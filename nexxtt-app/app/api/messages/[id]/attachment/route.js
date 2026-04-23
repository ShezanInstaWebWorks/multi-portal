import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

const ATTACHMENT_BUCKET = "chat-attachments";
const SIGN_TTL_SECONDS = 60 * 60; // 1 hour

// GET /api/messages/[id]/attachment
// Returns a short-lived signed URL for the attachment on the given message.
// Participant scope is enforced — anyone who can read the parent conversation
// can download.
export async function GET(_req, { params }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin.from("user_profiles").select("role, agency_id").eq("id", user.id).maybeSingle();
  if (!profile?.role) return Response.json({ error: "No profile" }, { status: 403 });

  const { data: msg } = await admin
    .from("messages")
    .select("id, conversation_id, attachment_path, attachment_name, attachment_mime, conversations:conversation_id ( id, tier, agency_id, client_id, direct_client_user_id, project_id )")
    .eq("id", id)
    .maybeSingle();
  if (!msg || !msg.attachment_path) return Response.json({ error: "Not found" }, { status: 404 });

  const conv = msg.conversations;
  const role = profile.role;
  const onScope =
    role === "admin" ||
    (conv?.tier === "agency"        && role === "agency"        && conv.agency_id === profile.agency_id) ||
    (conv?.tier === "agency"        && role === "agency_client" && await ownsClient(admin, user.id, conv.client_id)) ||
    (conv?.tier === "agency_admin"  && role === "agency"        && conv.agency_id === profile.agency_id) ||
    (conv?.tier === "project_admin" && role === "agency"        && conv.agency_id === profile.agency_id) ||
    (conv?.tier === "direct"        && role === "direct_client" && conv.direct_client_user_id === user.id) ||
    (conv?.tier === "project" && await isProjectParticipant(admin, user.id, role, profile.agency_id, conv.project_id));
  if (!onScope) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { data: signed, error } = await admin.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(msg.attachment_path, SIGN_TTL_SECONDS, {
      download: msg.attachment_name ?? undefined,
    });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ url: signed.signedUrl, name: msg.attachment_name, mime: msg.attachment_mime });
}

async function ownsClient(admin, userId, clientId) {
  if (!clientId) return false;
  const { data } = await admin.from("clients").select("id").eq("id", clientId).eq("portal_user_id", userId).maybeSingle();
  return !!data;
}

async function isProjectParticipant(admin, userId, role, userAgencyId, projectId) {
  if (!projectId) return false;
  const { data: project } = await admin
    .from("projects")
    .select("id, jobs ( agency_id, client_id, direct_client_user_id, clients ( portal_user_id ) )")
    .eq("id", projectId)
    .maybeSingle();
  const job = project?.jobs;
  if (!job) return false;
  if (role === "agency"        && job.agency_id === userAgencyId) return true;
  if (role === "agency_client" && job.clients?.portal_user_id === userId) return true;
  if (role === "direct_client" && job.direct_client_user_id === userId) return true;
  return false;
}
