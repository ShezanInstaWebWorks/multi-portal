// Pulls the latest client-submitted revision note for a project. We read from
// admin_actions (where the revision POST writes the authoritative audit row)
// so the shape is stable regardless of what goes into the project chat.
//
// Returns { note, requestedAt, requesterId } | null.
export async function getLatestRevisionNote(admin, projectId) {
  if (!projectId) return null;
  const { data } = await admin
    .from("admin_actions")
    .select("admin_id, metadata, created_at")
    .eq("action", "client_revision_request")
    .eq("target_type", "project")
    .eq("target_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    note: data.metadata?.note ?? "",
    requestedAt: data.created_at,
    requesterId: data.admin_id,
  };
}
