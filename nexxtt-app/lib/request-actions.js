// Given a request row + the current viewer, return the set of actions the
// viewer can take from the UI. Mirrors the server-side `canAct()` so the UI
// only shows buttons that will succeed.

export function availableActions({ request, viewerRole, viewerUserId }) {
  const actions = [];
  if (!request || !viewerRole) return actions;

  const tier = request.client_id ? "agency" : "direct";
  const isInitiator = request.initiator_user_id === viewerUserId;
  const clientInitiated = tier === "agency" && request.initiator_role === "agency_client";
  const terminal = ["rejected", "rejected_by_agency", "cancelled", "converted", "accepted"].includes(request.status);
  if (terminal) return actions;

  // NEW WORKFLOW: Sequential approval
  // 1. Agency client submits → pending_agency_review → Agency reviews
  // 2. Agency accepts → pending_admin_approval → Admin reviews
  // 3. Admin accepts → accepted → Can convert to job
  // 4. Agency sets project in_progress → submits to in_review when done
  // 5. Agency client approves or requests revisions

  // Agency partner reviews client-initiated requests
  if (request.status === "pending_agency_review" && viewerRole === "agency") {
    actions.push("accept", "counter", "reject");
  }

  // Initiator (client) can cancel while pending agency review
  if (request.status === "pending_agency_review" && isInitiator) {
    actions.push("cancel");
  }

  // Admin reviews after agency approves
  if (request.status === "pending_admin_approval" && viewerRole === "admin") {
    actions.push("admin_approve");
    actions.push("convert");
  }

  // Initiator can cancel before admin approves
  if (request.status === "pending_admin_approval" && isInitiator) {
    actions.push("cancel");
  }

  // Legacy statuses - keep for backward compatibility
  if (["pending_counterparty", "counter_offered", "pending_agency_review"].includes(request.status)) {
    if (isInitiator) {
      actions.push("cancel");
      if (request.status === "counter_offered") {
        actions.push("accept");
        // Client can also counter back to agency
        if (viewerRole === "agency_client") {
          actions.push("counter");
        }
      }
    } else if (request.status !== "pending_agency_review") {
      // For non-pending_agency_review, show counter/reject to counterparty
      const adminOnDirect = viewerRole === "admin" && tier === "direct";
      if (!adminOnDirect) actions.push("accept");
      actions.push("counter", "reject");
    }
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
