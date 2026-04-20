"use client";

import { KpiCard } from "./KpiCard";
import { StatusPill } from "./StatusPill";

// Placeholder data — wire to Supabase in Step 13+.
const KPIS = [
  {
    label: "Active Jobs",
    value: "3",
    delta: "↑ 1 new this week",
    deltaUp: true,
    accent: "blue",
    sparkHeights: [30, 50, 40, 65, 55, 70, 100],
  },
  {
    label: "This Month Revenue",
    value: "$6,800",
    delta: "↑ 18% vs last month",
    deltaUp: true,
    accent: "teal",
    sparkHeights: [40, 55, 48, 72, 80, 90, 100],
  },
  {
    label: "Profit This Month",
    value: "$4,200",
    delta: "↑ Avg 42% margin",
    deltaUp: true,
    accent: "rose",
    inverted: true,
    sparkHeights: [30, 45, 55, 65, 75, 88, 100],
  },
];

const ACTIVE_ORDERS = [
  {
    id: "1",
    service: "Website Design",
    serviceAccent: true,
    sub: "5 pages · Business",
    client: "Coastal Realty",
    status: "in_progress",
    due: "Apr 14",
    profit: "$480",
  },
  {
    id: "2",
    service: "Logo Design",
    sub: "3 concepts",
    client: "TechCore SaaS",
    status: "in_review",
    due: "Apr 11",
    profit: "$220",
  },
  {
    id: "3",
    service: "Brand Guidelines",
    sub: "Full system",
    client: "Bloom Beauty",
    status: "delivered",
    due: "Apr 16",
    profit: "$380",
  },
];

const ACTIVITIES = [
  {
    icon: "✅",
    iconBg: "rgba(16,185,129,0.1)",
    iconBorder: "rgba(16,185,129,0.25)",
    iconShadow: "0 2px 6px rgba(16,185,129,0.15)",
    title: "Logo Design delivered",
    sub: "Solis Advisory · Client approved · $220 profit confirmed",
    cta: "View →",
    time: "2 days ago",
  },
  {
    icon: "📋",
    iconBg: "var(--color-teal-bg)",
    iconBorder: "var(--color-teal-bdr)",
    iconShadow: "0 2px 6px rgba(0,184,169,0.12)",
    title: "New order placed",
    sub: "Brand Guidelines · Bloom Beauty · $320",
    time: "4 days ago",
  },
  {
    icon: "🪙",
    iconBg: "rgba(245,158,11,0.08)",
    iconBorder: "rgba(245,158,11,0.25)",
    iconShadow: "0 2px 6px rgba(245,158,11,0.12)",
    title: "Prepaid balance top-up",
    sub: "$4,000 top-up · 10% discount · Valid 6 months",
    time: "1 week ago",
  },
];

export function DashboardA() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {KPIS.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* 2-col: Active Orders + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mb-6">
        <ActiveOrders />
        <QuickStats />
      </div>

      {/* Activity feed */}
      <section className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
        <SectionHeader title="Recent Activity" />
        <div className="flex flex-col">
          {ACTIVITIES.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 py-3.5 ${
                i < ACTIVITIES.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[0.95rem] flex-shrink-0"
                style={{
                  background: a.iconBg,
                  border: `1px solid ${a.iconBorder}`,
                  boxShadow: a.iconShadow,
                }}
              >
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-dark text-[0.88rem]">{a.title}</div>
                <div className="text-[0.75rem] text-muted mt-px truncate">
                  {a.sub}
                </div>
              </div>
              {a.cta && (
                <button className="flex-shrink-0 text-xs text-body font-semibold px-3 py-1.5 rounded-md bg-off hover:bg-lg transition-colors">
                  {a.cta}
                </button>
              )}
              <div className="text-[0.75rem] text-muted whitespace-nowrap hidden sm:block">
                {a.time}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
      <div>
        <h2 className="font-display text-[1.2rem] font-extrabold text-dark">
          {title}
        </h2>
        {subtitle && <p className="text-[0.82rem] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ActiveOrders() {
  return (
    <section>
      <SectionHeader
        title="Active Orders"
        subtitle="Jobs currently in progress across your clients"
        action={
          <button className="text-xs text-body font-semibold px-3.5 py-2 rounded-[10px] bg-white border border-border hover:border-navy hover:shadow-md transition-all">
            View all →
          </button>
        }
      />

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-[16px] border border-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-off">
              {["Job", "Client", "Status", "Due", "Profit"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[0.72rem] font-bold text-muted uppercase"
                  style={{ letterSpacing: "0.08em" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACTIVE_ORDERS.map((row, i) => (
              <tr
                key={row.id}
                className={`cursor-pointer transition-colors hover:bg-teal-pale ${
                  i < ACTIVE_ORDERS.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <div
                    className="font-semibold"
                    style={{ color: row.serviceAccent ? "var(--color-teal)" : "var(--color-dark)" }}
                  >
                    {row.service}
                  </div>
                  <div className="text-[0.75rem] text-muted mt-0.5">{row.sub}</div>
                </td>
                <td className="px-4 py-3 text-body">{row.client}</td>
                <td className="px-4 py-3">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-4 py-3 font-semibold text-body">{row.due}</td>
                <td className="px-4 py-3 font-display font-extrabold text-base text-green">
                  {row.profit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden flex flex-col gap-2.5">
        {ACTIVE_ORDERS.map((row) => (
          <div
            key={row.id}
            className="bg-white border border-border rounded-[10px] p-4 shadow-sm active:translate-y-px transition-transform"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div
                  className="font-semibold text-sm"
                  style={{ color: row.serviceAccent ? "var(--color-teal)" : "var(--color-dark)" }}
                >
                  {row.service}
                </div>
                <div className="text-[0.72rem] text-muted mt-0.5">{row.sub}</div>
              </div>
              <div className="font-display font-extrabold text-green whitespace-nowrap">
                {row.profit}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={row.status} />
              <span className="text-[0.72rem] text-muted">
                {row.client} · Due {row.due}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickStats() {
  return (
    <section>
      <SectionHeader title="Quick Stats" />
      <div className="flex flex-col gap-3">
        <SmallStat
          label="Total Jobs (All Time)"
          value="7"
          meta="3 until Priority Unlock"
          accent="var(--color-teal)"
          valueColor="var(--color-teal)"
        />
        <SmallStat
          label="Clients Managed"
          value="4"
          meta="2 with portal access"
          accent="#3b82f6"
          valueColor="var(--color-navy)"
        />
        {/* Inverted hero */}
        <div
          className="relative overflow-hidden rounded-[12px] p-4"
          style={{
            background: "linear-gradient(135deg, #0d1f38, #1a3a5c)",
          }}
        >
          <div
            className="absolute bottom-[-20px] right-[-10px] w-20 h-20 rounded-full"
            style={{ background: "rgba(0,184,169,0.2)" }}
          />
          <div
            className="text-xs font-semibold uppercase mb-1.5 relative"
            style={{ letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)" }}
          >
            Total Profit Earned
          </div>
          <div
            className="font-display text-[1.6rem] font-extrabold relative z-[1]"
            style={{ color: "var(--color-teal)" }}
          >
            $3,140
          </div>
          <div className="text-[0.75rem] text-white/30 relative">
            Since joining nexxtt.io
          </div>
        </div>
      </div>
    </section>
  );
}

function SmallStat({ label, value, meta, accent, valueColor }) {
  return (
    <div
      className="bg-white border border-border rounded-[12px] p-4 shadow-sm"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div
        className="text-xs font-semibold uppercase text-muted mb-1"
        style={{ letterSpacing: "0.08em" }}
      >
        {label}
      </div>
      <div
        className="font-display font-extrabold text-[1.6rem] leading-none"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      <div className="text-[0.75rem] text-muted mt-1">{meta}</div>
    </div>
  );
}
