"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCents } from "@/lib/money";
import { OrderDrawer } from "@/components/admin/OrderDrawer";

// Each filter matches if the job itself OR any of its projects has a status
// in the given set. A job with one disputed project should appear under
// "Disputed" even if the parent job's overall status is still "brief_pending".
function jobOrAnyProject(statuses) {
  const set = new Set(statuses);
  return (j) => {
    if (set.has(j.status)) return true;
    return (j.projects ?? []).some((p) => set.has(p.status));
  };
}

const FILTERS = [
  { key: "all",       label: "All Orders" },
  { key: "active",    label: "Active",    match: jobOrAnyProject(["brief_pending", "in_progress", "revision_requested"]) },
  { key: "review",    label: "In Review", match: jobOrAnyProject(["in_review"]) },
  { key: "delivered", label: "Delivered", match: jobOrAnyProject(["delivered"]) },
  { key: "disputed",  label: "Disputed",  match: jobOrAnyProject(["disputed"]) },
];

export function OrdersList({ jobs }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set([jobs[0]?.id]));
  const [active, setActive] = useState(null); // { projectId, label }

  const counts = useMemo(() => {
    const c = { all: jobs.length };
    for (const f of FILTERS) {
      if (f.key === "all") continue;
      c[f.key] = jobs.filter(f.match).length;
    }
    return c;
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      const f = FILTERS.find((x) => x.key === filter);
      if (f?.match && !f.match(j)) return false;
      if (!q) return true;
      const hay = [
        j.job_number,
        j.clients?.business_name,
        ...(j.projects ?? []).map((p) => p.services?.name ?? ""),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, filter, query]);

  return (
    <div>
      {/* Top actions */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <div className="flex items-center gap-2 bg-white border border-border rounded-[10px] px-3.5 py-2 shadow-sm flex-1 min-w-[220px] max-w-[320px]">
          <Search className="w-4 h-4 text-muted" strokeWidth={2.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders…"
            className="flex-1 outline-none text-[0.88rem] bg-transparent"
          />
        </div>
        <Link
          href="/agency/orders/new"
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-semibold text-white hover:-translate-y-px transition-all"
          style={{
            background: "var(--color-teal)",
            boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
          }}
        >
          <Plus className="w-4 h-4" />
          New Order
        </Link>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-[0.8rem] font-semibold transition-all border ${
                active
                  ? "bg-teal text-white border-teal shadow-[0_2px_8px_rgba(0,184,169,0.25)]"
                  : "bg-white text-muted border-border hover:border-teal hover:text-teal"
              }`}
            >
              {f.label}{" "}
              <span className={active ? "opacity-80" : "opacity-50"}>
                ({counts[f.key] ?? 0})
              </span>
            </button>
          );
        })}
      </div>

      {/* Column headers — desktop only */}
      <div
        className="hidden lg:flex items-center gap-0 px-5 pl-20 pb-2 mb-2 text-[0.68rem] font-bold uppercase text-muted"
        style={{ letterSpacing: "0.1em" }}
      >
        <div className="flex-1">Service</div>
        <div className="w-[160px]">Status</div>
        <div className="w-[72px]">Due</div>
        <div className="w-[72px] text-right pr-3">Cost</div>
        <div className="w-[72px] text-right pr-3">Sell</div>
        <div className="w-[72px] text-right">Profit</div>
      </div>

      {/* Order cards */}
      <div className="flex flex-col gap-1.5">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-muted">
            No orders match the current filter.
          </div>
        )}
        {filtered.map((j) => (
          <OrderCard
            key={j.id}
            job={j}
            expanded={expanded.has(j.id)}
            onToggle={() =>
              setExpanded((s) => {
                const next = new Set(s);
                if (next.has(j.id)) next.delete(j.id);
                else next.add(j.id);
                return next;
              })
            }
            onOpenProject={(project) =>
              setActive({
                projectId: project.id,
                label: `${j.job_number} · ${project.services?.name ?? "Project"}`,
              })
            }
          />
        ))}
      </div>

      <div className="flex justify-end gap-6 pt-3 text-[0.72rem] text-muted flex-wrap">
        <span>Cost = what you pay nexxtt.io</span>
        <span>Sell = your price to client</span>
        <span className="text-green font-semibold">Profit = yours to keep</span>
      </div>

      <OrderDrawer
        open={!!active}
        src={active?.projectId ? `/agency/projects/${active.projectId}?embed=1` : null}
        openHref={active?.projectId ? `/agency/projects/${active.projectId}` : null}
        title={active?.label ?? null}
        subtitle="Project"
        onClose={() => setActive(null)}
      />
    </div>
  );
}

function OrderCard({ job, expanded, onToggle, onOpenProject }) {
  const profit = job.total_retail_cents - job.total_cost_cents;
  const marginPct = job.total_retail_cents > 0
    ? Math.round((profit / job.total_retail_cents) * 100)
    : 0;
  const created = new Date(job.created_at).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const projectCount = job.projects?.length ?? 0;

  return (
    <div className="bg-white border border-border rounded-[12px] shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Head */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 text-left px-3 lg:px-4 py-2.5 hover:bg-off transition-colors"
      >
        <ChevronRight
          className="w-4 h-4 text-muted shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        />
        {/* Meta block (grows on mobile) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-extrabold text-dark">
              #{job.job_number}
            </span>
            <StatusBadge status={job.status} />
            {job.is_rush && (
              <span
                className="inline-flex items-center px-2 py-[2px] rounded-full text-[0.62rem] font-bold"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  color: "var(--color-amber)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                RUSH
              </span>
            )}
          </div>
          <div className="text-[0.82rem] text-body font-semibold mt-0.5">
            {job.clients?.business_name ?? "—"}
          </div>
          <div className="text-[0.72rem] text-muted">
            {created} · {projectCount} project{projectCount === 1 ? "" : "s"}
          </div>
        </div>

        {/* Service tags — hidden on small */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap max-w-[240px]">
          {(job.projects ?? []).slice(0, 3).map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[0.7rem] font-semibold bg-off border border-border text-body whitespace-nowrap"
            >
              <span>{p.services?.icon ?? "•"}</span>
              <span>{p.services?.name ?? "Service"}</span>
            </span>
          ))}
          {projectCount > 3 && (
            <span className="text-[0.7rem] text-muted">+{projectCount - 3}</span>
          )}
        </div>

        {/* Numbers */}
        <div className="flex items-baseline gap-3 ml-3 pl-3 border-l border-border shrink-0">
          <div className="text-right">
            <div className="text-[0.68rem] text-muted uppercase" style={{ letterSpacing: "0.08em" }}>
              COST
            </div>
            <div className="text-[0.82rem] font-bold text-dark">
              {formatCents(job.total_cost_cents)}
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-[0.68rem] uppercase font-bold"
              style={{ letterSpacing: "0.08em", color: "var(--color-green)" }}
            >
              PROFIT
            </div>
            <div className="font-display text-[1.1rem] font-extrabold text-green">
              {formatCents(profit)}
            </div>
            <div className="text-[0.68rem] text-muted">{marginPct}% margin</div>
          </div>
        </div>
      </button>

      {/* Expanded projects */}
      {expanded && (job.projects?.length ?? 0) > 0 && (
        <div className="border-t border-border bg-off/40">
          {job.projects.map((p) => (
            <ProjectRow key={p.id} project={p} onOpen={() => onOpenProject(p)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project, onOpen }) {
  const profit = project.retail_price_cents - project.cost_price_cents;
  const dotColor = {
    brief_pending:      "var(--color-navy)",
    in_progress:        "var(--color-teal)",
    in_review:          "var(--color-amber)",
    delivered:          "var(--color-green)",
    revision_requested: "var(--color-blue)",
    disputed:           "var(--color-red)",
  }[project.status] ?? "var(--color-muted)";

  return (
    <div
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
      }}
      tabIndex={0}
      role="button"
      className="flex items-center gap-2.5 px-3 lg:px-4 py-1.5 cursor-pointer border-b border-border last:border-0 hover:bg-teal-pale transition-colors"
    >
      <div
        className="w-2 h-2 rounded-full shrink-0 ml-5"
        style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}66` }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[0.85rem] font-bold text-dark truncate">
          {project.services?.name ?? "Project"}
        </div>
        <div className="text-[0.72rem] text-muted truncate">
          {project.is_rush ? "Rush delivery" : `Due ${project.due_date ?? "—"}`}
        </div>
      </div>
      <div className="hidden lg:block w-[160px]">
        <StatusBadge status={project.status} />
      </div>
      <div className="hidden lg:block w-[72px] text-[0.82rem] text-body font-semibold">
        {project.due_date ?? "—"}
      </div>
      <div className="hidden lg:block w-[72px] text-right text-[0.82rem] text-body pr-3">
        {formatCents(project.cost_price_cents)}
      </div>
      <div className="hidden lg:block w-[72px] text-right text-[0.82rem] text-body pr-3">
        {formatCents(project.retail_price_cents)}
      </div>
      <div className="hidden lg:block w-[72px] text-right font-display font-extrabold text-green">
        {formatCents(profit)}
      </div>

      {/* Mobile: stacked badge + profit */}
      <div className="lg:hidden flex items-center gap-2">
        <StatusBadge status={project.status} />
        <div className="font-display font-extrabold text-green text-[0.9rem]">
          {formatCents(profit)}
        </div>
      </div>
    </div>
  );
}
