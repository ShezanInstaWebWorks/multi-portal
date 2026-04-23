// Helpers for inserting notification rows when something happens on a
// project_request or its conversation. Each helper figures out the "other
// side" relative to the actor and inserts one notification per recipient.

async function recipientsForScope(admin, { tier, agencyId, clientId, directClientUserId, projectId }, actorRole) {
  if (tier === "agency") {
    if (actorRole === "agency" || actorRole === "admin") {
      // Notify the client (portal_user_id on the clients row)
      const { data } = await admin
        .from("clients")
        .select("portal_user_id")
        .eq("id", clientId)
        .maybeSingle();
      return data?.portal_user_id ? [data.portal_user_id] : [];
    }
    // actor is the client → notify all agency users for this agency
    const { data } = await admin
      .from("user_profiles")
      .select("id")
      .eq("role", "agency")
      .eq("agency_id", agencyId);
    return (data ?? []).map((r) => r.id);
  }
  if (tier === "agency_admin") {
    if (actorRole === "admin") {
      // Admin → all agency users for this agency
      const { data } = await admin
        .from("user_profiles")
        .select("id")
        .eq("role", "agency")
        .eq("agency_id", agencyId);
      return (data ?? []).map((r) => r.id);
    }
    // Agency → all admins
    const { data } = await admin.from("user_profiles").select("id").eq("role", "admin");
    return (data ?? []).map((r) => r.id);
  }
  if (tier === "project_admin") {
    if (actorRole === "admin") {
      // Admin → all agency users for this project's agency
      const { data } = await admin
        .from("user_profiles")
        .select("id")
        .eq("role", "agency")
        .eq("agency_id", agencyId);
      return (data ?? []).map((r) => r.id);
    }
    // Agency → all admins
    const { data } = await admin.from("user_profiles").select("id").eq("role", "admin");
    return (data ?? []).map((r) => r.id);
  }
  // direct tier
  if (actorRole === "direct_client") {
    const { data } = await admin.from("user_profiles").select("id").eq("role", "admin");
    return (data ?? []).map((r) => r.id);
  }
  return directClientUserId ? [directClientUserId] : [];
}

export async function notifyForRequest(admin, { request, actorRole, type, title, body, link }) {
  const tier = request.client_id ? "agency" : "direct";
  const recipients = await recipientsForScope(
    admin,
    { tier, agencyId: request.agency_id, clientId: request.client_id, directClientUserId: request.direct_client_user_id },
    actorRole
  );
  if (recipients.length === 0) return;
  await admin.from("notifications").insert(
    recipients.map((user_id) => ({ user_id, type, title, body, link }))
  );
}

export async function notifyForConversation(admin, { conversation, actorUserId, actorRole, type, title, body, link }) {
  const recipients = await recipientsForScope(
    admin,
    {
      tier: conversation.tier,
      agencyId: conversation.agency_id,
      clientId: conversation.client_id,
      directClientUserId: conversation.direct_client_user_id,
      projectId: conversation.project_id,
    },
    actorRole
  );
  const filtered = recipients.filter((id) => id !== actorUserId);
  if (filtered.length === 0) return;
  await admin.from("notifications").insert(
    filtered.map((user_id) => ({ user_id, type, title, body, link }))
  );
}
