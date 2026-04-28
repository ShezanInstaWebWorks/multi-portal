import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { canAct, tierForRequest, needsAdminApproval, needsAgencyApproval } from "@/lib/project-requests";
import { retailFromCost } from "@/lib/money";
import { notifyForRequest } from "@/lib/request-notifications";
import { debitWallet, getBalanceCents } from "@/lib/wallet";

// Notify only agency users for pending_agency_review status
async function notifyAgencyOnly(admin, request, actorRole) {
  if (!request.agency_id) return;

  const { data: agencyUsers } = await admin
    .from("user_profiles")
    .select("id")
    .eq("role", "agency")
    .eq("agency_id", request.agency_id);

  if (!agencyUsers?.length) return;

  await admin.from("notifications").insert(
    agencyUsers.map((u) => ({
      user_id: u.id,
      type: "request_update",
      title: `New project request: ${request.title}`,
      body: "Review and approve this request from your client.",
      link: `/agency/requests`,
    }))
  );
}

// Notify only admin users for pending_admin_approval status
async function notifyAdminOnly(admin, request, actorRole) {
  const { data: admins } = await admin
    .from("user_profiles")
    .select("id")
    .eq("role", "admin");

  if (!admins?.length) return;

  await admin.from("notifications").insert(
    admins.map((u) => ({
      user_id: u.id,
      type: "request_update",
      title: `Agency approved request: ${request.title}`,
      body: "Review and approve this project request.",
      link: `/admin/requests`,
    }))
  );
}

async function checkWalletCovers({ admin, tier, clientId, directUserId, retailCents }) {
  const owner = tier === "agency"
    ? { clientId, directUserId: null }
    : { clientId: null, directUserId };
  if (!owner.clientId && !owner.directUserId) {
    return { ok: false, error: "No wallet owner on this request", available: 0 };
  }
  const balance = await getBalanceCents(admin, owner);
  if (balance < retailCents) {
    const need = (retailCents / 100).toFixed(2);
    const have = (balance     / 100).toFixed(2);
    return {
      ok: false,
      error: `Client's wallet is short ''� need $${need}, has $${have}. Ask them to top up before converting.`,
      available: balance,
    };
  }
  return { ok: true, available: balance };
}

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
      error: 'Action ' + action + ' not allowed from ' + role + ' in status ' + reqRow.status,
      code: "TRANSITION",
    }, { status: 400 });
  }

  // Build update based on action
  const now = new Date().toISOString();
  const patch = { updated_at: now };

  switch (action) {
    case "counter": {
      // Counter can have amount, date, or both - at least one is required
      const hasAmount = amount != null && amount > 0;
      const proposed = normalizeDate(body?.proposedDeliveryDate);
      const hasDate = proposed !== undefined;

      if (!hasAmount && !hasDate) {
        return Response.json({ error: "amountCents or proposedDeliveryDate required for counter", code: "VALIDATION" }, { status: 400 });
      }
      if (proposed === undefined && typeof body?.proposedDeliveryDate !== "undefined" && body?.proposedDeliveryDate !== "") {
        return Response.json({ error: "proposedDeliveryDate must be YYYY-MM-DD", code: "VALIDATION" }, { status: 400 });
      }
      if (hasDate) patch.proposed_delivery_date = proposed;

      patch.status = "counter_offered";
      if (hasAmount) patch.counter_amount_cents = amount;
      break;
    }
    case "accept": {
      // For new workflow:
      // - Agency client request (pending_agency_review) '�� Agency accepts '�� goes to admin (pending_admin_approval)
      // - Agency accepts '�� status becomes pending_admin_approval to notify admin
      // - Direct client request (pending_admin_approval) '�� Admin directly approves
      const needsAgency = needsAgencyApproval(reqRow);
      const isPendingAgencyReview = reqRow.status === "pending_agency_review";

      // If agency is accepting a client request, forward to admin
      if (isPendingAgencyReview && role === "agency") {
        patch.status = "pending_admin_approval";
      } else {
        // Direct client or legacy flow
        patch.accepted_at = now;
        patch.final_amount_cents =
          reqRow.counter_amount_cents ?? reqRow.proposed_amount_cents ?? null;
        patch.status = "accepted";
      }
      break;
    }

    case "forward_to_admin": {
      // Agency explicitly forwards an accepted request to admin
      patch.status = "pending_admin_approval";
      break;
    }

    case "reject": {
      // Agency rejecting a pending_agency_review request
      if (reqRow.status === "pending_agency_review" && role === "agency") {
        patch.status = "rejected_by_agency";
      } else {
        patch.status = "rejected";
      }
      // Store rejection reason if provided
      if (body?.reason) {
        patch.rejection_reason = body.reason.slice(0, 500);
      }
      break;
    }
    case "admin_approve": {
      // Admin confirms a client-initiated request, locks in the delivery
      // date AND immediately converts to a job. Previously this only set
      // `accepted` and the agency had to chain `send_to_admin` + `convert`,
      // which left the order invisible to the client until those extra
      // clicks happened.
      const adminProposed = normalizeDate(body?.proposedDeliveryDate);
      if (adminProposed === undefined && typeof body?.proposedDeliveryDate !== "undefined" && body?.proposedDeliveryDate !== "") {
        return Response.json({ error: "proposedDeliveryDate must be YYYY-MM-DD", code: "VALIDATION" }, { status: 400 });
      }
      if (adminProposed !== undefined) {
        patch.proposed_delivery_date = adminProposed;
        reqRow.proposed_delivery_date = adminProposed; // so convert sees the new date
      }
      if (!reqRow.proposed_delivery_date) {
        return Response.json(
          { error: "Set a delivery date before confirming this project", code: "DATES_REQUIRED" },
          { status: 400 }
        );
      }
      patch.accepted_at = reqRow.accepted_at ?? now;

      const convertResult = await runConvert({
        admin, user, reqRow, tier, body, now,
      });
      if (convertResult.error) return convertResult.error;
      Object.assign(patch, convertResult.patch);
      break;
    }
    case "cancel":
      patch.status = "cancelled";
      break;
    case "send_to_admin":
      patch.status = "sent_to_admin";
      patch.sent_to_admin_at = now;
      break;
    case "convert": {
      const convertResult = await runConvert({ admin, user, reqRow, tier, body, now });
      if (convertResult.error) return convertResult.error;
      Object.assign(patch, convertResult.patch);
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

  // Notify based on status changes
  const ACTION_TITLES = {
    counter:        'Counter-offer: ' + updated.title,
    accept:         'Project accepted: ' + updated.title,
    reject:         'Project rejected: ' + updated.title,
    cancel:         'Project cancelled: ' + updated.title,
    send_to_admin:  'Forwarded to admin: ' + updated.title,
    convert:        'Project converted to job: ' + updated.title,
    forward_to_admin: 'Request forwarded for approval: ' + updated.title,
  };

  const prevStatus = reqRow.status;
  const newStatus = updated.status;

  // Sequential approval notification flow
  if (newStatus === 'pending_agency_review') {
    await notifyAgencyOnly(admin, updated, role);
  }
  else if (newStatus === 'pending_admin_approval' && prevStatus === 'pending_agency_review') {
    await notifyAdminOnly(admin, updated, role);
  }
  else {
    await notifyForRequest(admin, {
      request: updated,
      actorRole: role,
      type: 'request_update',
      title: ACTION_TITLES[action] || 'Update: ' + updated.title,
      body: 'Tap to view.',
    });
  }

  return Response.json({ request: updated });
}

// Shared convert path: wallet check '�� job + projects insert '�� wallet debit.
// Returns either { error: <Response> } when something failed (caller returns
// it directly) or { patch: {...} } with fields to merge into the request row's
// patch (status=converted, converted_to_job_id, etc.).
async function runConvert({ admin, user, reqRow, tier, body, now }) {
  const ALLOWED_INITIAL = new Set(["brief_pending", "in_progress", "in_review", "delivered"]);
  const initialStatus = ALLOWED_INITIAL.has(body?.initialStatus)
    ? body.initialStatus
    : "brief_pending";

  const agreedCents = reqRow.final_amount_cents
    ?? reqRow.counter_amount_cents
    ?? reqRow.proposed_amount_cents
    ?? 0;
  const retailCents = retailFromCost(agreedCents);

  const walletCheck = await checkWalletCovers({
    admin,
    tier,
    clientId: reqRow.client_id,
    directUserId: reqRow.direct_client_user_id,
    retailCents,
  });
  if (!walletCheck.ok) {
    return {
      error: Response.json({
        error: walletCheck.error,
        code: "INSUFFICIENT_BALANCE",
        required: retailCents,
        available: walletCheck.available,
      }, { status: 402 }),
    };
  }

  const job = await insertJobWithUniqueNumber(admin, {
    status: initialStatus,
    total_cost_cents: agreedCents,
    total_retail_cents: retailCents,
    agency_id: tier === "agency" ? reqRow.agency_id : null,
    client_id: tier === "agency" ? reqRow.client_id : null,
    direct_client_user_id: tier === "direct" ? reqRow.direct_client_user_id : null,
  });
  if (!job.ok) {
    return {
      error: Response.json({ error: job.error, code: "JOB_INSERT_ERROR" }, { status: 500 }),
    };
  }

  const projectExtras = {};
  if (initialStatus === "delivered") projectExtras.delivered_at = now;
  const projectDueDate = reqRow.proposed_delivery_date ?? reqRow.preferred_delivery_date ?? null;
  if (projectDueDate) projectExtras.due_date = projectDueDate;

  // Per-package pricing: when the request has package_ids, each package
  // becomes its own project with the package's own cost/retail. When the
  // negotiated agreedCents differs from the packages' total, scale all
  // packages proportionally so they still sum to the agreed total.
  let projectRows;
  const packageIdList = Array.isArray(reqRow.package_ids) ? reqRow.package_ids : [];
  if (packageIdList.length > 0) {
    const { data: pkgs } = await admin
      .from("service_packages")
      .select("id, service_id, cost_cents, retail_cents")
      .in("id", packageIdList);
    const byId = new Map((pkgs ?? []).map((p) => [p.id, p]));
    const ordered = packageIdList.map((id) => byId.get(id)).filter(Boolean);

    const baseCost   = ordered.reduce((s, p) => s + (p.cost_cents   ?? 0), 0);
    const baseRetail = ordered.reduce((s, p) => s + (p.retail_cents ?? 0), 0);
    const costScale   = baseCost   > 0 ? agreedCents  / baseCost   : 1;
    const retailScale = baseRetail > 0 ? retailCents  / baseRetail : 1;

    let costSum = 0, retailSum = 0;
    projectRows = ordered.map((p, i) => {
      const isLast = i === ordered.length - 1;
      const cost   = isLast ? agreedCents  - costSum   : Math.round((p.cost_cents   ?? 0) * costScale);
      const retail = isLast ? retailCents  - retailSum : Math.round((p.retail_cents ?? 0) * retailScale);
      costSum   += cost;
      retailSum += retail;
      return {
        job_id: job.id,
        service_id: p.service_id,
        status: initialStatus,
        cost_price_cents:   cost,
        retail_price_cents: retail,
        ...projectExtras,
      };
    });
  } else {
    // Legacy fallback ''� multi-service requests with no packages: split evenly.
    const serviceList = (reqRow.service_ids?.length ? reqRow.service_ids : [reqRow.service_id ?? null])
      .filter(Boolean);
    const projectCount = Math.max(1, serviceList.length);
    const evenCost   = Math.floor(agreedCents  / projectCount);
    const evenRetail = Math.floor(retailCents  / projectCount);
    const costRem    = agreedCents  - (evenCost   * projectCount);
    const retailRem  = retailCents  - (evenRetail * projectCount);
    projectRows = (serviceList.length > 0 ? serviceList : [null]).map((sid, i) => {
      const isLast = i === projectCount - 1;
      return {
        job_id: job.id,
        service_id: sid,
        status: initialStatus,
        cost_price_cents:   evenCost   + (isLast ? costRem   : 0),
        retail_price_cents: evenRetail + (isLast ? retailRem : 0),
        ...projectExtras,
      };
    });
  }

  const { data: createdProjects } = await admin
    .from("projects")
    .insert(projectRows)
    .select("id");
  const createdProject = createdProjects?.[0] ?? null;

  try {
    await debitWallet(admin, {
      clientId: tier === "agency" ? reqRow.client_id : null,
      directUserId: tier === "direct" ? reqRow.direct_client_user_id : null,
      amountCents: retailCents,
      description: 'Job ' + (job.job_number || '') + ' - ' + reqRow.title,
      jobId: job.id,
      projectRequestId: reqRow.id,
      actorUserId: user.id,
    });
  } catch (e) {
    await admin.from("jobs").update({ status: "cancelled" }).eq("id", job.id);
    return {
      error: Response.json({
        error: e.message ?? "Wallet debit failed",
        code: e.code ?? "DEBIT_ERROR",
      }, { status: 500 }),
    };
  }

  return {
    patch: {
      status: "converted",
      converted_at: now,
      converted_to_job_id: job.id,
      converted_to_project_id: createdProject?.id ?? null,
      final_amount_cents: agreedCents,
    },
  };
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
