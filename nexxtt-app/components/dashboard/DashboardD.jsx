"use client";

import Link from "next/link";
import { tierFor, tierProgress } from "@/lib/priority";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";

// Wireframe s04d — command-center: 4 stat boxes, active-orders timeline,
// activity feed + earnings chart. Now wired to live, tenant-scoped data.

const ACTIVE_PROJECT_STATUSES = new Set([
  "brief_pending",
  "in_progress",
  "in_review",
  "revision_requested",
]);

function monthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function computeStats(jobs, clientsCount) {
  const now = new Date();
  const thisMonth = monthKey(now);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = monthKey(prevMonthDate);

  let activeProjects = 0;
  let completedProjects = 0;
  let totalProjects = 0;
  let activeThisMonthStarted = 0;
  let revenueThisMonth = 0;
  let revenuePrevMonth = 0;
  let costThisMonth = 0;
  let profitThisMonth = 0;
  let totalRevenue = 0;

  for (const j of jobs) {
    totalRevenue += j.total_retail_cents ?? 0;
    const mk = monthKey(j.created_at);
    const isThis = mk === thisMonth;
    const isPrev = mk === prevMonth;
    if (isThis) {
      revenueThisMonth += j.total_retail_cents ?? 0;
      costThisMonth += j.total_cost_cents ?? 0;
      profitThisMonth += (j.total_retail_cents ?? 0) - (j.total_cost_cents ?? 0);
      if ((j.projects ?? []).length > 0) activeThisMonthStarted += 1;
    }
    if (isPrev) revenuePrevMonth += j.total_retail_cents ?? 0;

    for (const p of j.projects ?? []) {
      totalProjects += 1;
      if (ACTIVE_PROJECT_STATUSES.has(p.status)) {
        activeProjects += 1;
      }
      if (p.status === "delivered" || p.status === "approved") {
        completedProjects += 1;
      }
    }
  }

  const revenueDelta =
    revenuePrevMonth > 0
      ? Math.round(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100)
      : null;
  const margin =
    revenueThisMonth > 0
      ? Math.round((profitThisMonth / revenueThisMonth) * 100)
      : null;

  return {
    activeProjects,
    completedProjects,
    totalProjects,
    activeThisMonthStarted,
    revenueThisMonth,
    profitThisMonth,
    revenueDelta,
    margin,
    clientsCount,
    totalRevenue,
  };
}

function statusBarStyle(status) {
  if (status === "in_progress" || status === "brief_pending") {
    return { background: "linear-gradient(90deg,#1e40af,#3b82f6)", color: "white" };
  }
  if (status === "in_review" || status === "revision_requested") {
    return { background: "linear-gradient(90deg,#b45309,#f59e0b)", color: "var(--color-dark)" };
  }
  if (status === "delivered" || status === "approved") {
    return { background: "linear-gradient(90deg,#059669,#10b981)", color: "white" };
  }
  if (status === "disputed") {
    return { background: "linear-gradient(90deg,#991b1b,#ef4444)", color: "white" };
  }
  return { background: "rgba(124,58,237,0.15)", color: "var(--color-adm)", border: "2px dashed rgba(124,58,237,0.4)" };
}

// Flatten jobs → projects for the timeline, filter to active ones, cap to 6.
function buildTimelineRows(jobs) {
  const rows = [];
  for (const j of jobs) {
    const clientName = j.clients?.business_name ?? "—";
    for (const p of j.projects ?? []) {
      if (!ACTIVE_PROJECT_STATUSES.has(p.status)) continue;
      rows.push({
        id: p.id,
        title: p.services?.name ?? "Project",
        icon: p.services?.icon ?? "•",
        client: clientName,
        status: p.status,
        due: p.due_date,
        profit: (p.retail_price_cents ?? 0) - (p.cost_price_cents ?? 0),
      });
    }
  }
  return rows.slice(0, 6);
}

function buildActivity(jobs) {
  const items = [];
  for (const j of jobs) {
    items.push({
      tag: "NEW ORDER",
      tagCls: "bg-blue/10 text-blue border-blue/30",
      title: `Order ${j.job_number} · ${j.clients?.business_name ?? "—"}`,
      sub: `${(j.projects ?? []).length} project${(j.projects ?? []).length === 1 ? "" : "s"} · ${formatCents(j.total_retail_cents)}`,
      time: new Date(j.created_at).toLocaleDateString("en-AU", { day: "2-digit", month: "short" }),
    });
    for (const p of j.projects ?? []) {
      if (p.status === "delivered") {
        items.push({
          tag: "DELIVERY",
          tagCls: "bg-green/10 text-green border-green/30",
          title: `${p.services?.name ?? "Project"} delivered`,
          sub: `${j.clients?.business_name ?? "—"} · Order ${j.job_number}`,
          time: p.due_date ? new Date(p.due_date).toLocaleDateString("en-AU", { day: "2-digit", month: "short" }) : "—",
        });
      }
    }
  }
  return items.slice(0, 6);
}

export function DashboardD({ agency, firstName, jobs = [], clientsCount = 0 }) {
  const stats = computeStats(jobs, clientsCount);
  const timelineRows = buildTimelineRows(jobs);
  const activity = buildActivity(jobs);

  const jobsCount = agency?.total_jobs_count ?? jobs.length;
  const { current, next } = tierFor(jobsCount);
  const { pct, toGo } = tierProgress(jobsCount);
  const initials = firstName
    ? firstName[0]?.toUpperCase() + (agency?.name?.[0]?.toUpperCase() ?? "")
    : "·";

  const STATS = [
    {
      label: "Total Projects",
      value: String(stats.totalProjects || jobs.length),
      icon: "📁",
      bgColor: "bg-blue-50",
      borderColor: "border-l-blue-500",
    },
    {
      label: "Active Projects",
      value: String(stats.activeProjects),
      icon: "⚡",
      bgColor: "bg-emerald-50",
      borderColor: "border-l-emerald-500",
    },
    {
      label: "Completed",
      value: String(stats.completedProjects),
      icon: "✅",
      bgColor: "bg-purple-50",
      borderColor: "border-l-purple-500",
    },
    {
      label: "Revenue",
      value: formatCents(stats.totalRevenue),
      icon: "💰",
      bgColor: "bg-amber-50",
      borderColor: "border-l-amber-500",
    },
  ];

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 pb-20 lg:pb-8">
      {/* Welcome strip with Priority Unlock */}
      <div
        className="rounded-[12px] p-3 sm:p-4 mb-4 sm:mb-5 border border-border shadow-sm"
        style={{ background: "linear-gradient(135deg, var(--color-off), white)" }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[0.78rem] font-extrabold text-white shrink-0"
            style={{
              background: "var(--color-amber)",
              boxShadow: "0 2px 8px rgba(245,158,11,0.35)",
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[0.88rem] font-bold text-dark truncate">
              {firstName ?? "Agency"} {agency?.name ? `· ${agency.name}` : ""}
            </div>
            <div
              className="text-[0.68rem] text-muted uppercase"
              style={{ letterSpacing: "0.04em" }}
            >
              AGENCY PARTNER · {current.label.toUpperCase()}
            </div>
          </div>
          <div className="basis-full sm:basis-auto sm:flex-1 sm:min-w-[180px] sm:max-w-[280px]">
            <div
              className="text-[0.65rem] font-bold uppercase text-muted flex justify-between mb-1.5"
              style={{ letterSpacing: "0.1em" }}
            >
              <span>PRIORITY UNLOCK</span>
              {next ? (
                <span style={{ color: next.color }}>
                  {jobsCount}/{next.min}
                </span>
              ) : (
                <span style={{ color: current.color }}>max tier</span>
              )}
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--color-lg)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: next
                    ? "linear-gradient(90deg,#f97316,#fbbf24)"
                    : "linear-gradient(90deg, var(--color-teal), var(--color-teal-l))",
                  boxShadow: next
                    ? "0 1px 4px rgba(249,115,22,0.4)"
                    : "0 1px 4px rgba(0,184,169,0.4)",
                }}
              />
            </div>
            <div className="text-[0.68rem] text-muted mt-1">
              {next
                ? `${toGo} more job${toGo === 1 ? "" : "s"} to unlock ${next.label}`
                : `You're at Elite — dedicated account manager + API access`}
            </div>
          </div>
        </div>
      </div>

      {/* 4 stat boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map((s, idx) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{s.label}</span>
              <span className="text-xl">{s.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
          <button className="text-sm text-teal font-medium hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {timelineRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    No projects yet
                  </td>
                </tr>
              ) : (
                timelineRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{row.icon}</span>
                        <span className="font-medium text-gray-900">{row.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.client}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.due ? new Date(row.due).toLocaleDateString('en-AU') : '—'}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{formatCents(row.profit + (row.profit * 2))}</td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active orders timeline — live data */}
      <section className="mb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
          <h2 className="font-display text-[1.2rem] font-extrabold text-dark">
            Active orders
          </h2>
          {jobs.length > 0 && (
            <Link
              href="/agency/dashboard?view=list"
              className="text-[0.78rem] font-semibold text-teal hover:underline"
            >
              View all →
            </Link>
          )}
        </div>

        <div className="bg-white border border-border rounded-[16px] shadow-sm overflow-hidden">
          {timelineRows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon="📋"
                title="No active orders"
                description={
                  jobs.length === 0
                    ? "You haven't placed an order yet. Invite your first client or place an order on their behalf to get started."
                    : "All your current orders are delivered or awaiting client approval. Place a new order to kick off the next brief."
                }
                action={
                  <Link
                    href="/agency/orders/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white"
                    style={{
                      background: "var(--color-teal)",
                      boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
                    }}
                  >
                    + New order
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {timelineRows.map((row) => (
                <Link
                  key={row.id}
                  href={`/agency/projects/${row.id}`}
                  className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-5 py-3 sm:py-3.5 hover:bg-off transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[1.05rem] shrink-0"
                    style={{
                      background: "var(--color-teal-pale)",
                      color: "var(--color-teal)",
                    }}
                  >
                    {row.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.85rem] sm:text-[0.88rem] font-bold text-dark truncate">
                      {row.title}
                    </div>
                    <div className="text-[0.7rem] sm:text-[0.72rem] text-muted truncate">
                      {row.client} · Due {row.due ?? "—"}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="font-display font-extrabold text-green text-[0.95rem] w-20 text-right hidden md:block shrink-0">
                    {formatCents(row.profit)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Activity + earnings placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        <div className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-sm">
          <h2 className="font-display text-[1.2rem] font-extrabold text-dark mb-3.5">
            Activity
          </h2>
          {activity.length === 0 ? (
            <div className="text-[0.85rem] text-muted py-6 text-center">
              No activity yet — it&apos;ll populate as orders are placed and projects move through delivery.
            </div>
          ) : (
            <div className="flex flex-col">
              {activity.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 py-3 ${
                    i < activity.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span
                    className={`rounded-full px-2 py-[2px] text-[0.62rem] font-extrabold border ${a.tagCls}`}
                    style={{ letterSpacing: "0.08em" }}
                  >
                    {a.tag}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.85rem] font-bold text-dark">{a.title}</div>
                    <div className="text-[0.72rem] text-muted">{a.sub}</div>
                  </div>
                  <div className="text-[0.72rem] text-muted whitespace-nowrap">
                    {a.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DarkEarningsPanel profit={stats.profitThisMonth} hasData={jobs.length > 0} />
      </div>
    </div>
  );
}

function DarkEarningsPanel({ profit, hasData }) {
  return (
    <div
      className="rounded-[16px] p-4 sm:p-5 shadow-lg"
      style={{ background: "linear-gradient(160deg,#0f1a2e,#1a2d4a)" }}
    >
      <div
        className="text-[0.65rem] font-bold uppercase text-white/35 mb-1.5"
        style={{ letterSpacing: "0.12em" }}
      >
        THIS MONTH · PROFIT
      </div>
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <div
          className="font-display text-[1.8rem] font-extrabold text-white"
          style={{ letterSpacing: "-0.03em" }}
        >
          {formatCents(profit)}
        </div>
      </div>
      {!hasData && (
        <div className="text-[0.8rem] text-white/50 leading-relaxed">
          Profit chart will populate as orders are delivered. Place your first
          order to start building your trailing-month view.
        </div>
      )}
    </div>
  );
}
