import crypto from "node:crypto";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { notifyForConversation } from "@/lib/request-notifications";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ATTACHMENT_BUCKET = "chat-attachments";

// POST /api/messages
// Accepts JSON OR multipart/form-data.
//   JSON:        { conversationId, body }
//   Multipart:   conversationId, body, file (optional)
// At least one of `body` or `file` must be present.
export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in", code: "NO_SESSION" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role;
  if (!role) {
    return Response.json({ error: "No profile", code: "NO_PROFILE" }, { status: 403 });
  }

  // Parse body — JSON or multipart
  const contentType = req.headers.get("content-type") ?? "";
  let conversationId = null;
  let text = "";
  let file = null;

  if (contentType.startsWith("multipart/form-data")) {
    const form = await req.formData();
    conversationId = form.get("conversationId");
    text = (form.get("body") ?? "").toString().trim();
    const f = form.get("file");
    if (f && typeof f !== "string") file = f;
  } else {
    let body;
    try { body = await req.json(); } catch { body = {}; }
    conversationId = body?.conversationId;
    text = typeof body?.body === "string" ? body.body.trim() : "";
  }

  if (!conversationId) {
    return Response.json({ error: "conversationId required", code: "VALIDATION" }, { status: 400 });
  }
  if (!text && !file) {
    return Response.json({ error: "Message or file required", code: "VALIDATION" }, { status: 400 });
  }
  if (text.length > 5000) {
    return Response.json({ error: "Message too long (5000 char max)", code: "VALIDATION" }, { status: 400 });
  }
  if (file && file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "File too large (max 10 MB)", code: "VALIDATION" }, { status: 400 });
  }

  // Verify participant scope
  const { data: conv } = await admin
    .from("conversations")
    .select("id, tier, agency_id, client_id, direct_client_user_id, project_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) {
    return Response.json({ error: "Conversation not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const onScope =
    role === "admin" ||
    (conv.tier === "agency"        && role === "agency"        && conv.agency_id === profile.agency_id) ||
    (conv.tier === "agency"        && role === "agency_client" && await isClientOwner(admin, user.id, conv.client_id)) ||
    (conv.tier === "agency_admin"  && role === "agency"        && conv.agency_id === profile.agency_id) ||
    (conv.tier === "project_admin" && role === "agency"        && conv.agency_id === profile.agency_id) ||
    (conv.tier === "direct"        && role === "direct_client" && conv.direct_client_user_id === user.id) ||
    (conv.tier === "project" && await isProjectParticipant(admin, user.id, role, profile.agency_id, conv.project_id));
  if (!onScope) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  // For project-scoped conversations (client-visible + private admin↔agency),
  // lock new messages once the project is delivered/approved/cancelled.
  // Reopening the project restores chatting — this is a per-write gate.
  if (conv.tier === "project" || conv.tier === "project_admin") {
    const { data: project } = await admin
      .from("projects")
      .select("status")
      .eq("id", conv.project_id)
      .maybeSingle();
    if (project && CLOSED_PROJECT_STATUSES.has(project.status)) {
      return Response.json(
        { error: "Project is closed — reopen it to chat again", code: "PROJECT_CLOSED" },
        { status: 409 }
      );
    }
  }

  // Upload first so we can include the path in the message row
  let attachment = null;
  if (file) {
    const safeName = sanitizeFilename(file.name || "file");
    const path = `${conversationId}/${crypto.randomUUID()}-${safeName}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage.from(ATTACHMENT_BUCKET).upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) {
      return Response.json({ error: `Upload failed: ${upErr.message}`, code: "UPLOAD_ERROR" }, { status: 500 });
    }
    attachment = {
      attachment_path: path,
      attachment_name: safeName,
      attachment_size: file.size,
      attachment_mime: file.type || "application/octet-stream",
    };
  }

  const { data: inserted, error: insertErr } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_role: role,
      body: text,
      ...(attachment ?? {}),
    })
    .select("*")
    .single();
  if (insertErr) {
    if (attachment?.attachment_path) {
      await admin.storage.from(ATTACHMENT_BUCKET).remove([attachment.attachment_path]).catch(() => {});
    }
    return Response.json({ error: insertErr.message, code: "INSERT_ERROR" }, { status: 500 });
  }

  await notifyForConversation(admin, {
    conversation: conv,
    actorUserId: user.id,
    actorRole: role,
    type: "message",
    title: "New message",
    body: text ? text.slice(0, 140) : `📎 ${attachment?.attachment_name ?? "Attachment"}`,
  });

  return Response.json({ message: inserted }, { status: 201 });
}

const CLOSED_PROJECT_STATUSES = new Set(["delivered", "approved", "cancelled"]);

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

async function isClientOwner(admin, userId, clientId) {
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
