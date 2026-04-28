// Shared helpers for the project-request workflow — validating state
// transitions across agency/direct tiers.
//
// Sequential approval workflow:
// 1. Agency client creates request → status: "pending_agency_review" (agency only)
// 2. Agency accepts/rejects → if accepted, status: "pending_admin_approval" (goes to admin)
// 3. Admin accepts → status: "accepted" → then can be converted to job
//
// For direct clients: status goes directly to "pending_admin_approval" (admin only)

export const REQUEST_STATUSES = [
  "pending_agency_review",    // Agency client submitted - waiting for agency partner
  "pending_counterparty",    // Legacy - client can counter
  "counter_offered",         // Legacy - counter offer made
  "rejected_by_agency",      // Agency rejected the request
  "pending_admin_approval",  // Agency approved - waiting for admin
  "accepted",                // Admin approved
  "rejected",                // Legacy rejection
  "sent_to_admin",          // Legacy
  "converted",              // Converted to job
  "cancelled",
];

export function tierForRequest(req) {
  if (req.client_id) return "agency";
  if (req.direct_client_user_id) return "direct";
  return null;
}

// True when the request needs agency approval first (client-initiated agency-tier)
export function needsAgencyApproval(request) {
  return tierForRequest(request) === "agency" && request.initiator_role === "agency_client";
}

// True when the request needs admin approval (after agency approved)
export function needsAdminApproval(request) {
  return request.status === "pending_admin_approval";
}

export function canAct({ role, action, currentStatus, tier, isInitiator }) {
  const terminal = ["rejected", "rejected_by_agency", "cancelled", "converted", "accepted"].includes(currentStatus);
  if (terminal) return false;

  switch (action) {
    case "counter":
      // Allow counter on legacy statuses and pending_agency_review (for agency to counter client requests)
      if (!["pending_counterparty", "counter_offered", "pending_agency_review"].includes(currentStatus)) return false;
      // Agency can always counter client-initiated requests, client can only counter back
      if (currentStatus === "pending_agency_review") return true;
      return !isInitiator || currentStatus === "counter_offered";

    case "accept":
      // Agency can accept when request is pending their review
      if (currentStatus === "pending_agency_review" && role === "agency") return true;
      // Legacy statuses
      if (!["pending_counterparty", "counter_offered"].includes(currentStatus)) return false;
      return true;

    case "reject":
      // Agency can reject when request is pending their review
      if (currentStatus === "pending_agency_review" && role === "agency") return true;
      // Legacy statuses
      if (!["pending_counterparty", "counter_offered"].includes(currentStatus)) return false;
      return !isInitiator;

    case "forward_to_admin":
      // Agency can forward to admin after accepting client request
      return role === "agency" && currentStatus === "pending_agency_review";

    case "cancel":
      if (!["pending_agency_review", "pending_counterparty", "counter_offered", "pending_admin_approval"].includes(currentStatus)) return false;
      return isInitiator;

    case "admin_approve":
      // Admin confirms a request that was approved by agency
      return role === "admin" && currentStatus === "pending_admin_approval";

    case "send_to_admin":
      // Legacy - for agency-initiated requests
      if (tier !== "agency") return false;
      if (role !== "agency" && role !== "admin") return false;
      return currentStatus === "accepted";

    case "convert":
      if (role !== "admin") return false;
      // Only convert when admin has approved
      return currentStatus === "accepted";

    default:
      return false;
  }
}
