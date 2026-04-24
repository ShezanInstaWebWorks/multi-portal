import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { canAct, tierForRequest, needsAdminApproval } from "@/lib/project-requests";
import { retailFromCost } from "@/lib/money";
import { notifyForRequest } from "@/lib/request-notifications";

function normalizeDate(value) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return value;
}

// PATCH /api/project-requests/[id]
// Body: { action: 'counter'|'accept'|'reject'|'cancel'|'send_to_admin'|'convert', amountCents? }
export async function PATCH(req, { params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in", code: "NO_SESSION" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role;
  if (!role) {
    return Response.json({ error: "No profile", code: "NO_PROFILE" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const action = body?.action;
  const amount = Number.isFinite(Number(body?.amountCents)) ? Math.max(0, Math.round(Number(body.amountCents))) : null;

  // Load + authorize access
  const { data: reqRow, error: loadErr } = await admin
    .from("project_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (loadErr || !reqRow) {
    return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Is this user on this request's scope?
  const tier = tierForRequest(reqRow);
  const onScope =
    role === "admin" ||
    (role === "agency"        && reqRow.agency_id === profile.agency_id) ||
    (role === "agency_client" && await isClientOwner(admin, user.id, reqRow.client_id)) ||
    (role === "direct_client" && reqRow.direct_client_user_id === user.id);
  if (!onScope) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const isInitiator = reqRow.initiator_user_id === user.id;
  if (!canAct({ role, action, currentStatus: reqRow.status, tier, isInitiator })) {
    return Response.json({
      error: `Action "${action}" not allowed from ${role} in status ${reqRow.status}`,
      code: "TRANSITION",
    }, { status: 400 });
  }

  // Build update based on action
  const now = new Date().toISOString();
  const patch = { updated_at: now };

  switch (action) {
    case "counter": {
      if (amount == null) {
        return Response.json({ error: "amountCents required for counter", code: "VALIDATION" }, { status: 400 });
      }
      // Agency's counter carries the proposed delivery date so the client sees
      // the full offer. Optional on other counters.
      const proposed = normalizeDate(body?.proposedDeliveryDate);
      if (proposed === undefined && typeof body?.proposedDeliveryDate !== "undefined" && body?.proposedDeliveryDate !== "") {
        return Response.json({ error: "proposedDeliveryDate must be YYYY-MM-DD", code: "VALIDATION" }, { status: 400 });
      }
      if (proposed !== undefined) patch.proposed_delivery_date = proposed;

      patch.status = "counter_offered";
      patch.counter_amount_cents = amount;
      break;
    }
    case "accept": {
      // Client-initiated agency-tier requests route through admin approval.
      const toAdmin = needsAdminApproval(reqRow);
      // Client accepting an agency-initiated request can lodge a preferred deadline.
      const preferred = normalizeDate(body?.preferredDeliveryDate);
      if (preferred === undefined && typeof body?.preferredDeliveryDate !== "undefined" && body?.preferredDeliveryDate !== "") {
        return Response.json({ error: "preferredDeliveryDate must be YYYY-MM-DD", code: "VALIDATION" }, { status: 400 });
      }
      if (preferred !== undefined) patch.preferred_delivery_date = preferred;

      patch.accepted_at = now;
      patch.final_amount_cents =
        reqRow.counter_amount_cents ?? reqRow.proposed_amount_cents ?? null;
      patch.status = toAdmin ? "pending_admin_approval" : "accepted";
      break;
    }
    case "admin_approve": {
      // Admin confirms a client-initiated request and locks in (or adjusts)
      // the delivery date before it goes live.
      const adminProposed = normalizeDate(body?.proposedDeliveryDate);
      if (adminProposed === undefined && typeof body?.proposedDeliveryDate !== "undefined" && body?.proposedDeliveryDate !== "") {
        return Response.json({ error: "proposedDeliveryDate must be YYYY-MM-DD", code: "VALIDATION" }, { status: 400 });
      }
      if (adminProposed !== undefined) patch.proposed_delivery_date = adminProposed;
      if (!patch.proposed_delivery_date && !reqRow.proposed_delivery_date) {
        return Response.json(
          { error: "Set a delivery date before confirming this project", code: "DATES_REQUIRED" },
          { status: 400 }
        );
      }
      patch.status = "accepted";
      patch.accepted_at = reqRow.accepted_at ?? now;
      break;
    }
    case "reject":
      patch.status = "rejected";
      break;
    case "cancel":
      patch.status = "cancelled";
      break;
    case "send_to_admin":
      patch.status = "sent_to_admin";
      patch.sent_to_admin_at = now;
      break;
    case "convert": {
      // Admin conversion — create a `jobs` + `projects` row so the rest of the
      // pipeline (uploads, approvals, billing) works unchanged. Super admin
      // chooses the initial status — they may want to start the job in the
      // normal pipeline (brief_pending) or mark it done themselves
      // (in_progress / in_review / delivered).
      const ALLOWED_INITIAL = new Set(["brief_pending", "in_progress", "in_review", "delivered"]);
      const initialStatus = ALLOWED_INITIAL.has(body?.initialStatus)
        ? body.initialStatus
        : "brief_pending";

      const agreedCents = reqRow.final_amount_cents
        ?? reqRow.counter_amount_cents
        ?? reqRow.proposed_amount_cents
        ?? 0;
      const retailCents = retailFromCost(agreedCents);

      const job = await insertJobWithUniqueNumber(admin, {
        status: initialStatus,
        total_cost_cents: agreedCents,
        total_retail_cents: retailCents,
        agency_id: tier === "agency" ? reqRow.agency_id : null,
        client_id: tier === "agency" ? reqRow.client_id : null,
        direct_client_user_id: tier === "direct" ? reqRow.direct_client_user_id : null,
      });
      if (!job.ok) {
        return Response.json({ error: job.error, code: "JOB_INSERT_ERROR" }, { status: 500 });
      }

      const projectExtras = {};
      if (initialStatus === "delivered") projectExtras.delivered_at = now;
      // Delivery date flows: admin's proposed_delivery_date is authoritative;
      // fall back to the client's preferred_delivery_date if admin didn't set one.
      const projectDueDate = reqRow.proposed_delivery_date ?? reqRow.preferred_delivery_date ?? null;
      if (projectDueDate) projectExtras.due_date = projectDueDate;

      const { data: createdProject } = await admin.from("projects").insert({
        job_id: job.id,
        service_id: reqRow.service_id,
        status: initialStatus,
        cost_price_cents: agreedCents,
        retail_price_cents: retailCents,
        ...projectExtras,
      }).select("id").single();

      patch.status = "converted";
      patch.converted_at = now;
      patch.converted_to_job_id = job.id;
      patch.converted_to_project_id = createdProject?.id ?? null;
      patch.final_amount_cents = agreedCents;
      break;
    }
    default:
      return Response.json({ error: "Unknown action", code: "ACTION" }, { status: 400 });
  }

  const { data: updated, error: updateErr } = await admin
    .from("project_requests")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (updateErr) {
    return Response.json({ error: updateErr.message, code: "UPDATE_ERROR" }, { status: 500 });
  }

  // Notify the counterparty about the new state
  const ACTION_TITLES = {
    counter:        `Counter-offer on “${updated.title}”`,
    accept:         `Project accepted: “${updated.title}”`,
    reject:         `Project rejected: “${updated.title}”`,
    cancel:         `Project cancelled: “${updated.title}”`,
    send_to_admin:  `Forwarded to admin: “${updated.title}”`,
    convert:        `Project converted to job: “${updated.title}”`,
  };
  // Helper builds per-recipient deep-links (admin → /admin, agency → /agency,
  // client → their portal, direct → /direct). Passing a single link here
  // would route some recipients to routes they can't view.
  await notifyForRequest(admin, {
    request: updated,
    actorRole: role,
    type: "request_update",
    title: ACTION_TITLES[action] ?? `Update on “${updated.title}”`,
    body: ACTION_TITLES[action] ?? "Tap to view.",
  });

  return Response.json({ request: updated });
}

async function isClientOwner(admin, userId, clientId) {
  if (!clientId) return false;
  const { data } = await admin
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("portal_user_id", userId)
    .maybeSingle();
  return !!data;
}

// Generates the next NXT-YYYY-#### number for the current calendar year and
// inserts the job. Retries on a uniqueness collision (concurrent converts).
async function insertJobWithUniqueNumber(admin, jobInsert) {
  const year = new Date().getFullYear();
  const prefix = `NXT-${year}-`;

  // Find the highest sequence already used for this year
  const { data: rows, error: scanErr } = await admin
    .from("jobs")
    .select("job_number")
    .like("job_number", `${prefix}%`);
  if (scanErr) return { ok: false, error: scanErr.message };

  let maxSeq = 0;
  for (const r of rows ?? []) {
    const tail = r.job_number?.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }

  // Up to 5 attempts in case two converts race
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${prefix}${String(maxSeq + 1 + attempt).padStart(4, "0")}`;
    const { data: job, error: insertErr } = await admin
      .from("jobs")
      .insert({ ...jobInsert, job_number: candidate })
      .select("id, job_number")
      .single();
    if (!insertErr) return { ok: true, ...job };
    // Postgres unique violation code is 23505
    if (insertErr.code !== "23505") return { ok: false, error: insertErr.message };
  }
  return { ok: false, error: "Could not allocate a unique job number after retries" };
}
