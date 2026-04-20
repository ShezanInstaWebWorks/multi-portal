"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid,
} from "recharts";
import { Download } from "lucide-react";
import { formatCents } from "@/lib/money";

const RANGES = [
  { key: "6m",  label: "Last 6 months", monthsBack: 6 },
  { key: "ytd", label: "This year",     monthsBack: null, ytd: true },
  { key: "all", label: "All time",      monthsBack: null },
];

export function ProfitDashboard({ jobs }) {
  const [rangeKey, setRangeKey] = useState("6m");
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[0];

  const filtered = useMemo(() => filterByRange(jobs, range), [jobs, range]);

  const totals = useMemo(() => {
    const billed = sum(filtered, (j) => j.total_retail_cents);
    const cost   = sum(filtered, (j) => j.total_cost_cents);
    const profit = billed - cost;
    const margin = billed > 0 ? Math.round((profit / billed) * 100) : 0;
    return { billed, cost, profit, margin };
  }, [filtered]);

  const monthly = useMemo(() => aggregateByMonth(filtered, range), [filtered, range]);
  const byClient = useMemo(() => aggregateByClient(filtered), [filtered]);

  function exportCsv() {
    const rows = [
      ["Job", "Client", "Date", "Services", "Billed", "Cost", "Profit", "Margin"],
      ...filtered.map((j) => [
        j.job_number,
        j.client_name,
        new Date(j.created_at).toISOString().slice(0, 10),
        j.services.join(" + "),
        (j.total_retail_cents / 100).toFixed(2),
        (j.total_cost_cents / 100).toFixed(2),
        (j.profit_cents / 100).toFixed(2),
        j.total_retail_cents > 0
          ? Math.round((j.profit_cents / j.total_retail_cents) * 100) + "%"
          : "0%",
      ]),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-${rangeKey}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Top actions */}
      <div className="flex items-center justify-end gap-2 mb-5 flex-wrap">
        <select
          value={rangeKey}
          onChange={(e) => setRangeKey(e.target.value)}
          className="input max-w-[180px] text-[0.85rem]"
        >
          {RANGES.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-sm font-semibold bg-white border border-border hover:border-navy hover:shadow-md transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Total Billed to Clients"
          value={formatCents(totals.billed)}
          sub={`${filtered.length} job${filtered.length === 1 ? "" : "s"} in range`}
          accent="var(--color-dark)"
        />
        <Stat
          label="Paid to nexxtt.io"
          value={formatCents(totals.cost)}
          sub="Your cost base"
          accent="#3b82f6"
          subColor="var(--color-muted)"
        />
        <Stat
          label="Gross Profit Earned"
          value={formatCents(totals.profit)}
          sub="In your pocket"
          accent="var(--color-green)"
          valueColor="var(--color-green)"
          subColor="var(--color-green)"
        />
        <Stat
          label="Average Margin"
          value={`${totals.margin}%`}
          sub="Profit ÷ Billed"
          accent="var(--color-amber)"
        />
      </div>

      {/* 2-col: bar chart + client breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start mb-6">
        {/* Revenue vs Profit by Month */}
        <section className="bg-white rounded-[16px] border border-border p-5 shadow-sm">
          <h3 className="font-display text-[1rem] font-extrabold text-dark">
            Revenue vs Profit by Month
          </h3>
          <p className="text-[0.78rem] text-muted mb-4">
            Billed to clients vs. your actual profit
          </p>
          {monthly.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted">No jobs in range.</div>
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} barGap={4} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--color-muted)", fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${Math.round(v / 100)}`}
                    tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    formatter={(v) => formatCents(v)}
                    contentStyle={{
                      background: "white",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      boxShadow: "var(--shadow-md)",
                      fontSize: "0.82rem",
                    }}
                    labelStyle={{ color: "var(--color-dark)", fontWeight: 700 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "0.72rem", color: "var(--color-muted)" }}
                    iconType="square"
                    iconSize={10}
                  />
                  <Bar dataKey="billed" name="Billed to client" fill="#C4CAD6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Your profit"      fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Profit by Client */}
        <section className="bg-white rounded-[16px] border border-border p-5 shadow-sm">
          <h3 className="font-display text-[1rem] font-extrabold text-dark mb-4">
            Profit by Client
          </h3>
          {byClient.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted">No jobs in range.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {byClient.map((c) => {
                const pct = byClient[0].profit > 0
                  ? Math.round((c.profit / byClient[0].profit) * 100)
                  : 0;
                return (
                  <div key={c.client_name}>
                    <div className="flex justify-between mb-1 text-[0.82rem]">
                      <span className="font-semibold text-dark truncate pr-2">
                        {c.client_name}
                      </span>
                      <span className="font-bold text-green whitespace-nowrap">
                        {formatCents(c.profit)}
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--color-lg)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(8, pct)}%`,
                          background:
                            "linear-gradient(90deg, var(--color-teal), var(--color-teal-l))",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Job table */}
      <section className="bg-white rounded-[16px] border border-border overflow-hidden shadow-sm">
        <header className="px-5 py-4 border-b border-border">
          <h3 className="font-display text-[1rem] font-extrabold text-dark">
            Jobs in range
          </h3>
        </header>

        {/* Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-off">
                {["Job", "Client", "Date", "Services", "Billed", "Cost", "Profit", "Margin"].map((h) => (
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
              {filtered.map((j, i) => (
                <tr
                  key={j.id}
                  className={`hover:bg-teal-pale transition-colors ${
                    i < filtered.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-dark text-[0.85rem]">
                    {j.job_number}
                  </td>
                  <td className="px-4 py-3 text-body">{j.client_name}</td>
                  <td className="px-4 py-3 text-body text-[0.82rem]">
                    {new Date(j.created_at).toLocaleDateString("en-AU", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-[0.82rem] text-muted">
                    {j.services.join(" + ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-body">{formatCents(j.total_retail_cents)}</td>
                  <td className="px-4 py-3 text-body">{formatCents(j.total_cost_cents)}</td>
                  <td className="px-4 py-3 font-display font-extrabold text-green">
                    {formatCents(j.profit_cents)}
                  </td>
                  <td className="px-4 py-3 text-body">
                    {j.total_retail_cents > 0
                      ? Math.round((j.profit_cents / j.total_retail_cents) * 100) + "%"
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden flex flex-col">
          {filtered.map((j, i) => (
            <div
              key={j.id}
              className={`px-4 py-3 ${i < filtered.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-dark text-[0.9rem]">
                    {j.job_number}
                  </div>
                  <div className="text-[0.75rem] text-muted">
                    {j.client_name} ·{" "}
                    {new Date(j.created_at).toLocaleDateString("en-AU", {
                      day: "2-digit", month: "short",
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-extrabold text-green">
                    {formatCents(j.profit_cents)}
                  </div>
                  <div className="text-[0.72rem] text-muted">
                    {j.total_retail_cents > 0
                      ? Math.round((j.profit_cents / j.total_retail_cents) * 100) + "% margin"
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────
function Stat({ label, value, sub, accent, valueColor, subColor }) {
  return (
    <div className="relative bg-white border border-border rounded-xl p-5 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: accent }}
      />
      <div
        className="text-[11px] font-bold text-muted uppercase mb-2"
        style={{ letterSpacing: "0.08em" }}
      >
        {label}
      </div>
      <div
        className="font-display text-[1.9rem] font-extrabold leading-none"
        style={{ color: valueColor ?? "var(--color-dark)" }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[0.78rem] mt-1.5"
          style={{ color: subColor ?? "var(--color-muted)" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function sum(arr, f) {
  return arr.reduce((a, x) => a + (f(x) ?? 0), 0);
}

function filterByRange(jobs, range) {
  if (range.key === "all") return jobs;
  const now = new Date();
  if (range.ytd) {
    const start = new Date(now.getFullYear(), 0, 1);
    return jobs.filter((j) => new Date(j.created_at) >= start);
  }
  if (range.monthsBack) {
    const start = new Date();
    start.setMonth(start.getMonth() - range.monthsBack + 1);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return jobs.filter((j) => new Date(j.created_at) >= start);
  }
  return jobs;
}

function aggregateByMonth(jobs, range) {
  const months = [];
  const now = new Date();
  const count =
    range.key === "6m" ? 6
      : range.ytd ? now.getMonth() + 1
      : null;

  if (count) {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: monthLabel(d), billed: 0, profit: 0 });
    }
  } else {
    // All time — derive buckets from data.
    const seen = new Map();
    for (const j of jobs) {
      const d = new Date(j.created_at);
      const k = monthKey(d);
      if (!seen.has(k)) seen.set(k, { key: k, label: monthLabel(d), billed: 0, profit: 0 });
    }
    months.push(...Array.from(seen.values()).sort((a, b) => a.key.localeCompare(b.key)));
  }

  for (const j of jobs) {
    const d = new Date(j.created_at);
    const k = monthKey(d);
    const m = months.find((m) => m.key === k);
    if (m) {
      m.billed += j.total_retail_cents;
      m.profit += j.profit_cents;
    }
  }
  return months.map((m) => ({ month: m.label, billed: m.billed, profit: m.profit }));
}

function aggregateByClient(jobs) {
  const map = new Map();
  for (const j of jobs) {
    const k = j.client_name ?? "—";
    const cur = map.get(k) ?? { client_name: k, billed: 0, profit: 0 };
    cur.billed += j.total_retail_cents;
    cur.profit += j.profit_cents;
    map.set(k, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d) {
  return d.toLocaleDateString("en-AU", { month: "short" });
}

function csvCell(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
