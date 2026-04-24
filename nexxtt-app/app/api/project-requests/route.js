import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { notifyForRequest } from "@/lib/request-notifications";

// POST /api/project-requests
// Body for agency-client initiator: { title, description?, serviceId?, proposedAmountCents? }
// Body for agency initiator:        { title, description?, serviceId?, proposedAmountCents?, clientId }
// Body for direct-client initiator: { title, description?, serviceId?, proposedAmountCents? }
// Body for admin initiator:         { title, description?, serviceId?, proposedAmountCents?, directClientUserId }
export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in", code: "NO_SESSION" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, agency_id, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  if (!role || !["agency_client", "agency", "direct_client", "admin"].includes(role)) {
    return Response.json({ error: "Unsupported role", code: "ROLE" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON", code: "BAD_JSON" }, { status: 400 }); }

  const {
    title,
    description,
    serviceId,
    proposedAmountCents,
    proposedDeliveryDate,
    clientId,
    directClientUserId,
  } = body ?? {};

  if (!title || String(title).trim().length < 2) {
    return Response.json({ error: "Title is required", code: "VALIDATION" }, { status: 400 });
  }
  const amount = Number.isFinite(Number(proposedAmountCents)) ? Math.max(0, Math.round(Number(proposedAmountCents))) : null;

  const row = {
    initiator_user_id: user.id,
    initiator_role: role,
    title: String(title).trim().slice(0, 200),
    description: typeof description === "string" ? description.trim() || null : null,
    service_id: serviceId || null,
    proposed_amount_cents: amount,
    status: "pending_counterparty",
  };
  if (typeof proposedDeliveryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(proposedDeliveryDate)) {
    row.proposed_delivery_date = proposedDeliveryDate;
  }

  // Resolve tier + scope from the initiator's role
  if (role === "agency_client") {
    // Find the client row owned by this user
    const { data: myClient } = await admin
      .from("clients")
      .select("id, agency_id")
      .eq("portal_user_id", user.id)
      .maybeSingle();
    if (!myClient) {
      return Response.json({ error: "No client record for this user", code: "NO_CLIENT" }, { status: 400 });
    }
    row.client_id = myClient.id;
    row.agency_id = myClient.agency_id;
  } else if (role === "agency") {
    if (!clientId) {
      return Response.json({ error: "clientId required", code: "VALIDATION" }, { status: 400 });
    }
    // client must belong to this agency
    const { data: c } = await admin
      .from("clients")
      .select("id, agency_id")
      .eq("id", clientId)
      .maybeSingle();
    if (!c || c.agency_id !== profile.agency_id) {
      return Response.json({ error: "Client not in your agency", code: "FORBIDDEN" }, { status: 403 });
    }
    row.client_id = c.id;
    row.agency_id = c.agency_id;
  } else if (role === "direct_client") {
    row.direct_client_user_id = user.id;
  } else if (role === "admin") {
    if (!directClientUserId) {
      return Response.json({ error: "directClientUserId required", code: "VALIDATION" }, { status: 400 });
    }
    row.direct_client_user_id = directClientUserId;
  }

  const { data: inserted, error: insertErr } = await admin
    .from("project_requests")
    .insert(row)
    .select("*")
    .single();
  if (insertErr) {
    return Response.json({ error: insertErr.message, code: "INSERT_ERROR" }, { status: 500 });
  }

  // Notify the counterparty side — helper builds a per-recipient deep-link.
  await notifyForRequest(admin, {
    request: inserted,
    actorRole: role,
    type: "request_new",
    title: `New project request — ${inserted.title}`,
    body: inserted.description ? inserted.description.slice(0, 140) : "Tap to review and respond.",
  });

  return Response.json({ request: inserted }, { status: 201 });
}
