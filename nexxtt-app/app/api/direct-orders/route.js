import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { OrderPlacedEmail } from "@/emails/OrderPlacedEmail";

export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return Response.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "direct_client") {
    return Response.json({ error: "Direct client account required", code: "NOT_DIRECT" }, { status: 403 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "BAD_JSON" }, { status: 400 });
  }

  const { items, attachments } = payload ?? {};
  const orderAttachments = Array.isArray(attachments)
    ? attachments.filter((a) => a?.path && a?.name)
    : [];
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json(
      { error: "At least one item is required", code: "VALIDATION" },
      { status: 400 }
    );
  }

  const serviceIds = items.map((i) => i.serviceId);
  const { data: services, error: svcErr } = await supabase
    .from("services")
    .select("id, cost_price_cents, default_retail_cents, sla_days, rush_sla_days, slug")
    .in("id", serviceIds);
  if (svcErr || !services || services.length !== serviceIds.length) {
    return Response.json(
      { error: "Unknown service id in items", code: "UNKNOWN_SERVICE" },
      { status: 400 }
    );
  }

  const { data: config } = await supabase
    .from("platform_config")
    .select("rush_surcharge")
    .limit(1)
    .single();
  const rushSurcharge = Number(config?.rush_surcharge ?? 0.5);

  const pricedItems = items.map((i) => {
    const svc = services.find((s) => s.id === i.serviceId);
    const rush = !!i.rush;
    const cost = Math.round(svc.cost_price_cents * (rush ? 1 + rushSurcharge : 1));
    const retail = rush
      ? Math.round(svc.default_retail_cents * (1 + rushSurcharge))
      : svc.default_retail_cents;
    const slaDays = rush ? svc.rush_sla_days : svc.sla_days;
    const due = new Date(Date.now() + slaDays * 24 * 3600 * 1000);
    return {
      serviceId: i.serviceId,
      rush,
      cost_cents: cost,
      retail_cents: retail,
      due_date: due.toISOString().slice(0, 10),
      brief: i.brief ?? {},
      slug: svc.slug,
    };
  });

  const totalRetail = pricedItems.reduce((a, p) => a + p.retail_cents, 0);

  const admin = createAdminSupabaseClient();

  const { data: jobNumber, error: jnErr } = await admin.rpc("generate_job_number");
  if (jnErr) {
    return Response.json({ error: jnErr.message, code: "JOB_NUMBER_ERROR" }, { status: 500 });
  }

  const isRushOverall = pricedItems.some((p) => p.rush);
  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .insert({
      job_number: jobNumber,
      direct_client_user_id: user.id,
      placed_by: user.id,
      status: "brief_pending",
      is_rush: isRushOverall,
      total_cost_cents: 0,
      total_retail_cents: totalRetail,
      payment_method: "pending",
    })
    .select("id, job_number, status, is_rush, total_retail_cents, created_at")
    .single();

  if (jobErr) {
    return Response.json({ error: jobErr.message, code: "JOB_INSERT_ERROR" }, { status: 500 });
  }

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
    return Response.json({ error: projErr.message, code: "PROJECT_INSERT_ERROR" }, { status: 500 });
  }

  const briefRows = projects.map((proj) => {
    const item = pricedItems.find((p) => p.serviceId === proj.service_id);
    return {
      project_id: proj.id,
      service_slug: item?.slug ?? "service",
      data: {
        ...(item?.brief ?? {}),
        ...(orderAttachments.length > 0 ? { _attachments: orderAttachments } : {}),
      },
    };
  });
  const { error: briefErr } = await admin.from("briefs").insert(briefRows);
  if (briefErr) {
    console.error("brief insert failed:", briefErr);
  }

  const notifications = [
    {
      user_id: user.id,
      type: "order_update",
      title: `Order ${job.job_number} placed`,
      body: `${pricedItems.length} project${pricedItems.length === 1 ? "" : "s"} · ${money(totalRetail)} total. We'll get started right away.`,
      link: `/direct/orders/${job.id}`,
    },
  ];

  const { data: admins } = await admin
    .from("user_profiles")
    .select("id")
    .eq("role", "admin");
  for (const a of admins ?? []) {
    notifications.push({
      user_id: a.id,
      type: "order_update",
      title: `New direct client order: ${job.job_number}`,
      body: `${money(totalRetail)} · ${pricedItems.length} service${pricedItems.length === 1 ? "" : "s"} · placed by ${user.email}`,
      link: `/admin/orders`,
    });
  }
  await admin.from("notifications").insert(notifications);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const servicesForEmail = pricedItems.map((p) => {
    const svc = services.find((s) => s.id === p.serviceId);
    return {
      name: svc?.name ?? "Project",
      icon: svc?.icon ?? "•",
      retail_cents: p.retail_cents,
    };
  });

  await sendEmail({
    to: user.email,
    subject: `Order ${job.job_number} placed — ${money(totalRetail)} total`,
    react: (
      <OrderPlacedEmail
        recipientName={user.user_metadata?.first_name ?? user.email}
        jobNumber={job.job_number}
        services={servicesForEmail}
        totalRetailCents={totalRetail}
        totalProfitCents={0}
        link={`${appUrl}/direct/orders/${job.id}`}
        viewer="direct_client"
      />
    ),
  });

  return Response.json({ job }, { status: 201 });
}

function money(cents) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}
