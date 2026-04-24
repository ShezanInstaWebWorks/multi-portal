// Builds the correct notification deep-link for a given recipient. The link
// has to match the recipient's role and portal (admins see /admin/*, agencies
// /agency/*, white-label clients /portal/<agency>/<client>/*, direct /direct/*)
// — using a single link for all recipients lands some of them on a blank page
// they don't have a route for.

export function linkForConversationRecipient(conv, role, { agencyPortalSlug, clientPortalSlug } = {}) {
  const projectId = conv.project_id;

  if (conv.tier === "agency") {
    if (role === "agency_client") {
      if (agencyPortalSlug && clientPortalSlug) {
        return `/portal/${agencyPortalSlug}/${clientPortalSlug}/requests`;
      }
      // No slugs available — fall back to login, which will route the user to
      // their portal via ROLE_HOME. Better than `/portal` (404).
      return "/login";
    }
    if (role === "admin") return "/admin/requests";
    return "/agency/requests"; // role === "agency"
  }

  if (conv.tier === "agency_admin") {
    if (role === "admin") return "/admin/requests";
    return "/agency/requests?thread=admin";
  }

  if (conv.tier === "direct") {
    if (role === "direct_client") return "/direct/requests";
    return "/admin/requests"; // role === "admin"
  }

  if (conv.tier === "project") {
    if (role === "admin")         return `/admin/projects/${projectId}?tab=chat`;
    if (role === "agency")        return `/agency/projects/${projectId}?tab=chat`;
    if (role === "direct_client") return `/direct/projects/${projectId}?tab=chat`;
    if (role === "agency_client" && agencyPortalSlug && clientPortalSlug) {
      return `/portal/${agencyPortalSlug}/${clientPortalSlug}/projects/${projectId}?tab=chat`;
    }
    return "/login";
  }

  if (conv.tier === "project_admin") {
    if (role === "admin") return `/admin/projects/${projectId}?tab=chat&thread=admin`;
    return `/agency/projects/${projectId}?tab=chat&thread=admin`;
  }

  return "/";
}

export function linkForRequestRecipient(request, role, { agencyPortalSlug, clientPortalSlug } = {}) {
  const convertedJobId = request.converted_to_job_id;

  // Once converted, a notification about the request is really about the
  // resulting job. `/agency/orders/[id]` now redirects to the first project,
  // so agency links resolve. Admin/direct land on their orders list.
  if (convertedJobId) {
    if (role === "admin")         return "/admin/orders";
    if (role === "agency")        return `/agency/orders/${convertedJobId}`;
    if (role === "direct_client") return `/direct/orders/${convertedJobId}`;
    if (role === "agency_client" && agencyPortalSlug && clientPortalSlug) {
      return `/portal/${agencyPortalSlug}/${clientPortalSlug}`;
    }
    return "/login";
  }

  // Pre-conversion request. Route to each role's requests inbox.
  if (role === "admin")         return "/admin/requests";
  if (role === "agency")        return "/agency/requests";
  if (role === "direct_client") return "/direct/requests";
  if (role === "agency_client" && agencyPortalSlug && clientPortalSlug) {
    return `/portal/${agencyPortalSlug}/${clientPortalSlug}/requests`;
  }
  return "/login";
}
