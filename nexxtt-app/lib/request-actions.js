// Given a request row + the current viewer, return the set of actions the
// viewer can take from the UI. Mirrors the server-side `canAct()` so the UI
// only shows buttons that will succeed.

export function availableActions({ request, viewerRole, viewerUserId }) {
  const actions = [];
  if (!request || !viewerRole) return actions;

  const tier = request.client_id ? "agency" : "direct";
  const isInitiator = request.initiator_user_id === viewerUserId;
  const clientInitiated = tier === "agency" && request.initiator_role === "agency_client";
  const terminal = ["rejected", "cancelled", "converted"].includes(request.status);
  if (terminal) return actions;

  // Negotiation phase — counter / accept / reject / cancel
  if (["pending_counterparty", "counter_offered"].includes(request.status)) {
    if (isInitiator) {
      actions.push("cancel");
      if (request.status === "counter_offered") actions.push("accept");
    } else {
      // Counterparty: agency on client-initiated must counter or reject — not accept.
      if (!(tier === "agency" && viewerRole === "agency" && clientInitiated)) {
        actions.push("accept");
      }
      actions.push("counter", "reject");
    }
  }

  // Initiator can cancel before admin approves
  if (request.status === "pending_admin_approval" && isInitiator) {
    actions.push("cancel");
  }

  // Admin approves a client-initiated request that the client has accepted
  if (request.status === "pending_admin_approval" && viewerRole === "admin") {
    actions.push("admin_approve");
    actions.push("convert");
  }

  // Agency partner sends an accepted agency-initiated request on to admin
  if (tier === "agency" && request.status === "accepted" && (viewerRole === "agency" || viewerRole === "admin")) {
    actions.push("send_to_admin");
  }

  // Admin converts to a real job
  if (viewerRole === "admin") {
    if (tier === "agency" && request.status === "sent_to_admin") actions.push("convert");
    if (tier === "direct" && ["accepted", "counter_offered", "pending_counterparty"].includes(request.status)) {
      actions.push("convert");
    }
  }

  return actions;
}
