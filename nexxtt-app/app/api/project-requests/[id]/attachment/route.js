import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

const ATTACHMENT_BUCKET = "chat-attachments";
const SIGN_TTL_SECONDS = 60 * 60; // 1 hour

// GET /api/project-requests/[id]/attachment?path=<storage-path>
// Returns a short-lived signed URL for an attachment on the given request.
// Anyone allowed to view the parent request can download.
export async function GET(req, { params }) {
  const { id } = await params;
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) return Response.json({ error: "path required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.role) return Response.json({ error: "No profile" }, { status: 403 });

  const { data: request } = await admin
    .from("project_requests")
    .select("id, attachments, agency_id, client_id, direct_client_user_id, initiator_user_id")
    .eq("id", id)
    .maybeSingle();
  if (!request) return Response.json({ error: "Not found" }, { status: 404 });

  // The path must actually be in this request's attachment list — no
  // path-traversal to other requests' files.
  const allowed = (request.attachments ?? []).some((a) => a?.path === path);
  if (!allowed) return Response.json({ error: "Not found" }, { status: 404 });

  const role = profile.role;
  let onScope = role === "admin" || request.initiator_user_id === user.id;

  if (!onScope && role === "agency") {
    onScope = request.agency_id && request.agency_id === profile.agency_id;
  }
  if (!onScope && role === "agency_client" && request.client_id) {
    const { data: client } = await admin
      .from("clients")
      .select("id")
      .eq("id", request.client_id)
      .eq("portal_user_id", user.id)
      .maybeSingle();
    onScope = !!client;
  }
  if (!onScope && role === "direct_client") {
    onScope = request.direct_client_user_id === user.id;
  }
  if (!onScope) return Response.json({ error: "Forbidden" }, { status: 403 });

  const meta = (request.attachments ?? []).find((a) => a?.path === path);
  const { data: signed, error } = await admin.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, SIGN_TTL_SECONDS, {
      download: meta?.name ?? undefined,
    });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ url: signed.signedUrl, name: meta?.name ?? null, mime: meta?.mime ?? null });
}
