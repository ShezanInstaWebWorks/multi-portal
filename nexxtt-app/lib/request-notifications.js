// Helpers for inserting notification rows when something happens on a
// project_request or its conversation. Each helper figures out the "other
// side" relative to the actor AND the correct deep-link per recipient (links
// that work for an admin do not work for an agency_client, etc.).

import { linkForConversationRecipient, linkForRequestRecipient } from "./notification-links";

// Returns [{ id, role }] — the role is the recipient's role, which drives
// where the notification deep-links to.
async function recipientsForScope(admin, { tier, agencyId, clientId, directClientUserId }, actorRole) {
  if (tier === "agency") {
    if (actorRole === "agency" || actorRole === "admin") {
      const { data } = await admin
        .from("clients")
        .select("portal_user_id")
        .eq("id", clientId)
        .maybeSingle();
      return data?.portal_user_id ? [{ id: data.portal_user_id, role: "agency_client" }] : [];
    }
    // actor is the client → notify all agency users for this agency
    const { data } = await admin
      .from("user_profiles")
      .select("id")
      .eq("role", "agency")
      .eq("agency_id", agencyId);
    return (data ?? []).map((r) => ({ id: r.id, role: "agency" }));
  }
  if (tier === "agency_admin") {
    if (actorRole === "admin") {
      const { data } = await admin
        .from("user_profiles")
        .select("id")
        .eq("role", "agency")
        .eq("agency_id", agencyId);
      return (data ?? []).map((r) => ({ id: r.id, role: "agency" }));
    }
    const { data } = await admin.from("user_profiles").select("id").eq("role", "admin");
    return (data ?? []).map((r) => ({ id: r.id, role: "admin" }));
  }
  if (tier === "project_admin") {
    if (actorRole === "admin") {
      const { data } = await admin
        .from("user_profiles")
        .select("id")
        .eq("role", "agency")
        .eq("agency_id", agencyId);
      return (data ?? []).map((r) => ({ id: r.id, role: "agency" }));
    }
    const { data } = await admin.from("user_profiles").select("id").eq("role", "admin");
    return (data ?? []).map((r) => ({ id: r.id, role: "admin" }));
  }
  if (tier === "project") {
    // Project-tier conversations include the agency/client (or direct_client).
    // Always notify everyone on the project except the actor.
    const recipients = [];
    if (agencyId) {
      const { data: agencyUsers } = await admin
        .from("user_profiles")
        .select("id")
        .eq("role", "agency")
        .eq("agency_id", agencyId);
      for (const r of agencyUsers ?? []) recipients.push({ id: r.id, role: "agency" });
    }
    if (clientId) {
      const { data: clientRow } = await admin
        .from("clients")
        .select("portal_user_id")
        .eq("id", clientId)
        .maybeSingle();
      if (clientRow?.portal_user_id) {
        recipients.push({ id: clientRow.portal_user_id, role: "agency_client" });
      }
    }
    if (directClientUserId) {
      recipients.push({ id: directClientUserId, role: "direct_client" });
    }
    return recipients;
  }
  // direct tier
  if (actorRole === "direct_client") {
    const { data } = await admin.from("user_profiles").select("id").eq("role", "admin");
    return (data ?? []).map((r) => ({ id: r.id, role: "admin" }));
  }
  return directClientUserId ? [{ id: directClientUserId, role: "direct_client" }] : [];
}

// Look up agency + client portal slugs once per notification batch so we can
// build correct /portal/<agency>/<client>/… links for agency_client recipients.
async function fetchPortalSlugs(admin, { agencyId, clientId }) {
  if (!agencyId && !clientId) return {};
  const [agencyRes, clientRes] = await Promise.all([
    agencyId ? admin.from("agencies").select("portal_slug").eq("id", agencyId).maybeSingle() : Promise.resolve({ data: null }),
    clientId ? admin.from("clients").select("portal_slug").eq("id", clientId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return {
    agencyPortalSlug: agencyRes.data?.portal_slug ?? null,
    clientPortalSlug: clientRes.data?.portal_slug ?? null,
  };
}

export async function notifyForRequest(admin, { request, actorRole, type, title, body, link: overrideLink }) {
  const tier = request.client_id ? "agency" : "direct";
  const recipients = await recipientsForScope(
    admin,
    { tier, agencyId: request.agency_id, clientId: request.client_id, directClientUserId: request.direct_client_user_id },
    actorRole
  );
  if (recipients.length === 0) return;

  const slugs = await fetchPortalSlugs(admin, {
    agencyId: request.agency_id,
    clientId: request.client_id,
  });

  await admin.from("notifications").insert(
    recipients.map(({ id, role }) => ({
      user_id: id,
      type,
      title,
      body,
      link: overrideLink ?? linkForRequestRecipient(request, role, slugs),
    }))
  );
}

export async function notifyForConversation(admin, { conversation, actorUserId, actorRole, type, title, body, link: overrideLink }) {
  // For project-tier we need the owning job's agency/client/direct so we can
  // fan out to everyone attached to the project — without that lookup we can
  // only reach participants named directly on the conversation row.
  let effectiveScope = {
    tier: conversation.tier,
    agencyId: conversation.agency_id,
    clientId: conversation.client_id,
    directClientUserId: conversation.direct_client_user_id,
  };
  if (conversation.tier === "project" && conversation.project_id) {
    const { data: project } = await admin
      .from("projects")
      .select("jobs ( agency_id, client_id, direct_client_user_id )")
      .eq("id", conversation.project_id)
      .maybeSingle();
    const job = project?.jobs;
    if (job) {
      effectiveScope = {
        tier: "project",
        agencyId: job.agency_id,
        clientId: job.client_id,
        directClientUserId: job.direct_client_user_id,
      };
    }
  }

  const recipients = await recipientsForScope(admin, effectiveScope, actorRole);
  const filtered = recipients.filter((r) => r.id !== actorUserId);
  if (filtered.length === 0) return;

  const slugs = await fetchPortalSlugs(admin, {
    agencyId: effectiveScope.agencyId,
    clientId: effectiveScope.clientId,
  });

  await admin.from("notifications").insert(
    filtered.map(({ id, role }) => ({
      user_id: id,
      type,
      title,
      body,
      link: overrideLink ?? linkForConversationRecipient(conversation, role, slugs),
    }))
  );
}
