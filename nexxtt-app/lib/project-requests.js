// Shared helpers for the project-request workflow — validating state
// transitions across agency/direct tiers.
//
// Updated model:
// - Client-initiated agency-tier requests require admin approval before they
//   become "accepted". The client's accept on the agency's counter routes to
//   `pending_admin_approval`, and admin runs `admin_approve` to finalize.
// - Agency-initiated agency-tier requests: client can accept directly (with
//   an optional preferred delivery date) and the agency still forwards to
//   admin via `send_to_admin` as before.
// - Direct tier is unchanged — admin and direct client only.

export const REQUEST_STATUSES = [
  "pending_counterparty",
  "counter_offered",
  "accepted",
  "rejected",
  "pending_admin_approval",
  "sent_to_admin",
  "converted",
  "cancelled",
];

export function tierForRequest(req) {
  if (req.client_id) return "agency";
  if (req.direct_client_user_id) return "direct";
  return null;
}

// True when the next `accept` on this request should route to admin approval
// instead of flipping straight to 'accepted'. Only applies to agency-tier,
// client-initiated requests.
export function needsAdminApproval(request) {
  return tierForRequest(request) === "agency" && request.initiator_role === "agency_client";
}

export function canAct({ role, action, currentStatus, tier, isInitiator }) {
  const terminal = ["rejected", "cancelled", "converted"].includes(currentStatus);
  if (terminal) return false;

  switch (action) {
    case "counter":
      if (!["pending_counterparty", "counter_offered"].includes(currentStatus)) return false;
      // counterparty counters
      return !isInitiator || currentStatus === "counter_offered";

    case "accept":
      if (!["pending_counterparty", "counter_offered"].includes(currentStatus)) return false;
      // Any counterparty (or the initiator on a counter_offered) can accept.
      // For client-initiated agency-tier requests the /accept handler routes
      // through `pending_admin_approval` so admin can set the delivery date
      // before it goes live.
      return true;

    case "reject":
      if (!["pending_counterparty", "counter_offered"].includes(currentStatus)) return false;
      return !isInitiator;

    case "cancel":
      if (!["pending_counterparty", "counter_offered", "pending_admin_approval"].includes(currentStatus)) return false;
      return isInitiator;

    case "admin_approve":
      // Admin confirms a client-initiated, now-client-accepted request, setting
      // (or confirming) the delivery date. Status → 'accepted'.
      return role === "admin" && currentStatus === "pending_admin_approval";

    case "send_to_admin":
      if (tier !== "agency") return false;
      if (role !== "agency" && role !== "admin") return false;
      return currentStatus === "accepted";

    case "convert":
      if (role !== "admin") return false;
      if (tier === "agency") {
        return currentStatus === "sent_to_admin" || currentStatus === "accepted" || currentStatus === "pending_admin_approval";
      }
      if (tier === "direct") {
        return ["accepted", "counter_offered", "pending_counterparty"].includes(currentStatus);
      }
      return false;

    default:
      return false;
  }
}
