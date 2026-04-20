import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return Response.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
  }

  // Resolve the agency for this user — never trust agencyId from the client.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id || !["agency", "admin"].includes(profile.role)) {
    return Response.json({ error: "Agency account required", code: "NOT_AGENCY" }, { status: 403 });
  }
  const agencyId = profile.agency_id;

  // Parse + validate body
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "BAD_JSON" }, { status: 400 });
  }

  const { clientId, items } = payload ?? {};
  if (!clientId || !Array.isArray(items) || items.length === 0) {
    return Response.json(
      { error: "clientId and at least one item are required", code: "VALIDATION" },
      { status: 400 }
    );
  }

  // Confirm the client belongs to this agency (RLS would block cross-agency,
  // but we want a clear 403 rather than a confusing RLS error).
  const { data: client } = await supabase
    .from("clients")
    .select("id, agency_id, portal_user_id")
    .eq("id", clientId)
    .single();
  if (!client || client.agency_id !== agencyId) {
    return Response.json(
      { error: "Client not found for this agency", code: "CLIENT_SCOPE" },
      { status: 403 }
    );
  }

  // Re-price server-side from services table to prevent tampering.
  const serviceIds = items.map((i) => i.serviceId);
  const { data: services, error: svcErr } = await supabase
    .from("services")
    .select("id, cost_price_cents, default_retail_cents, sla_days, rush_sla_days")
    .in("id", serviceIds);
  if (svcErr || !services || services.length !== serviceIds.length) {
    return Response.json(
      { error: "Unknown service id in items", code: "UNKNOWN_SERVICE" },
      { status: 400 }
    );
  }

  // Fetch rush surcharge from platform_config
  const { data: config } = await supabase
    .from("platform_config")
    .select("rush_surcharge")
    .limit(1)
    .single();
  const rushSurcharge = Number(config?.rush_surcharge ?? 0.5);
  const DEFAULT_MARKUP = 0.35;

  // Compute canonical cost + retail + due date per item
  const pricedItems = items.map((i) => {
    const svc = services.find((s) => s.id === i.serviceId);
    const rush = !!i.rush;
    const cost = Math.round(
      svc.cost_price_cents * (rush ? 1 + rushSurcharge : 1)
    );
    const retail = Math.round(cost * (1 + DEFAULT_MARKUP));
    const slaDays = rush ? svc.rush_sla_days : svc.sla_days;
    const due = new Date(Date.now() + slaDays * 24 * 3600 * 1000);
    return {
      serviceId: i.serviceId,
      rush,
      cost_cents: cost,
      retail_cents: retail,
      due_date: due.toISOString().slice(0, 10),
      brief: i.brief ?? {},
    };
  });

  const totalCost = pricedItems.reduce((a, p) => a + p.cost_cents, 0);
  const totalRetail = pricedItems.reduce((a, p) => a + p.retail_cents, 0);

  // Use admin client for the write transaction so we can insert + update
  // across multiple tables consistently. Authorization has already been
  // enforced above via the session-scoped profile lookup.
  const admin = createAdminSupabaseClient();

  // 1. Atomic balance deduction
  const { data: deductResult, error: deductErr } = await admin.rpc("deduct_balance", {
    p_agency_id: agencyId,
    p_amount: totalCost,
  });
  if (deductErr) {
    return Response.json(
      { error: deductErr.message, code: "DEDUCT_ERROR" },
      { status: 500 }
    );
  }
  if (!deductResult?.success) {
    return Response.json(
      { error: "Insufficient balance", code: "INSUFFICIENT_BALANCE" },
      { status: 402 }
    );
  }
  const newBalance = deductResult.new_balance;

  // 2. Job number via SQL function
  const { data: jobNumber, error: jnErr } = await admin.rpc("generate_job_number");
  if (jnErr) {
    // Refund — best-effort, not transactional, but keeps balance consistent on error.
    await admin.rpc("deduct_balance", { p_agency_id: agencyId, p_amount: -totalCost });
    return Response.json({ error: jnErr.message, code: "JOB_NUMBER_ERROR" }, { status: 500 });
  }

  // 3. Insert job
  const isRushOverall = pricedItems.some((p) => p.rush);
  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .insert({
      job_number: jobNumber,
      agency_id: agencyId,
      client_id: clientId,
      placed_by: user.id,
      status: "brief_pending",
      is_rush: isRushOverall,
      total_cost_cents: totalCost,
      total_retail_cents: totalRetail,
      payment_method: "balance",
    })
    .select("id, job_number, status, is_rush, total_cost_cents, total_retail_cents, created_at")
    .single();

  if (jobErr) {
    await admin.rpc("deduct_balance", { p_agency_id: agencyId, p_amount: -totalCost });
    return Response.json({ error: jobErr.message, code: "JOB_INSERT_ERROR" }, { status: 500 });
  }

  // 4. Insert projects + briefs
  const projectRows = pricedItems.map((p) => ({
    job_id: job.id,
    service_id: p.serviceId,
    status: "brief_pending",
    cost_price_cents: p.cost_cents,
    retail_price_cents: p.retail_cents,
    is_rush: p.rush,
    due_date: p.due_date,
  }));
  const { data: projects, error: projErr } = await admin
    .from("projects")
    .insert(projectRows)
    .select("id, service_id");
  if (projErr) {
    await admin.from("jobs").delete().eq("id", job.id);
    await admin.rpc("deduct_balance", { p_agency_id: agencyId, p_amount: -totalCost });
    return Response.json({ error: projErr.message, code: "PROJECT_INSERT_ERROR" }, { status: 500 });
  }

  const briefRows = projects.map((proj) => {
    const item = pricedItems.find((p) => p.serviceId === proj.service_id);
    const svc = services.find((s) => s.id === proj.service_id);
    const slug = SLUG_BY_ID[proj.service_id] ?? "service";
    return {
      project_id: proj.id,
      service_slug: slug,
      data: item.brief ?? {},
    };
  });
  // Fall back: if slug missing, look up from services table
  for (const b of briefRows) {
    if (b.service_slug === "service") {
      const proj = projects.find((p) => p.id === b.project_id);
      const { data: svcRow } = await admin.from("services").select("slug").eq("id", proj.service_id).single();
      if (svcRow?.slug) b.service_slug = svcRow.slug;
    }
  }
  const { error: briefErr } = await admin.from("briefs").insert(briefRows);
  if (briefErr) {
    // Non-fatal for the order itself; log but keep going.
    console.error("brief insert failed:", briefErr);
  }

  // 5. Record balance transaction
  await admin.from("balance_transactions").insert({
    agency_id: agencyId,
    type: "debit",
    amount_cents: -totalCost,
    balance_after_cents: newBalance,
    description: `Order ${job.job_number}`,
    related_job_id: job.id,
  });

  // 6. Notify the agency user who placed the order, and the client (if active).
  const notifications = [
    {
      user_id: user.id,
      type: "order_update",
      title: `Order ${job.job_number} placed`,
      body: `${pricedItems.length} project${pricedItems.length === 1 ? "" : "s"} · ${money(totalRetail)} billed · ${money(totalRetail - totalCost)} profit`,
      link: `/agency/orders/${job.id}`,
    },
  ];
  if (client && client.portal_user_id) {
    notifications.push({
      user_id: client.portal_user_id,
      type: "order_update",
      title: "A new project is underway",
      body: `${pricedItems.length} service${pricedItems.length === 1 ? "" : "s"} added to your portal`,
      link: null,
    });
  }
  await admin.from("notifications").insert(notifications);

  return Response.json({ job, newBalance }, { status: 201 });
}

function money(cents) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

// Slug map cache — populated lazily if needed, else empty.
const SLUG_BY_ID = {};
