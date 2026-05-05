"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";

function jobOrAnyProject(statuses) {
  const set = new Set(statuses);
  return (j) => {
    if (set.has(j.status)) return true;
    return (j.projects ?? []).some((p) => set.has(p.status));
  };
}

const FILTERS = [
  { key: "all",       label: "All Projects" },
  { key: "active",    label: "Active",    match: jobOrAnyProject(["brief_pending", "in_progress", "revision_requested"]) },
  { key: "review",    label: "In Review", match: jobOrAnyProject(["in_review"]) },
  { key: "delivered", label: "Delivered", match: jobOrAnyProject(["delivered"]) },
  { key: "disputed",  label: "Disputed",  match: jobOrAnyProject(["disputed"]) },
];

export function ClientProjectsList({ jobs, agencySlug, clientSlug, brand }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set([jobs[0]?.id]));

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
        ...(j.projects ?? []).map((p) => p.services?.name ?? ""),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, filter, query]);

  const accentColor = brand?.accent_colour ?? "#00B8A9";
  const primaryColor = brand?.primary_colour ?? "#0B1F3A";

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-white border border-border rounded-[10px] px-3.5 py-2 shadow-sm flex-1 min-w-[220px] max-w-[320px]">
          <Search className="w-4 h-4 text-muted" strokeWidth={2.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="flex-1 outline-none text-[0.88rem] bg-transparent"
          />
        </div>
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
                  ? "text-white border-teal shadow-[0_2px_8px_rgba(0,184,169,0.25)]"
                  : "bg-white text-muted border-border hover:border-teal hover:text-teal"
              }`}
              style={active ? { background: accentColor, borderColor: accentColor } : {}}
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
        className="hidden lg:flex items-center gap-0 px-5 pl-16 pb-2 mb-2 text-[0.68rem] font-bold uppercase text-muted"
        style={{ letterSpacing: "0.1em" }}
      >
        <div className="flex-1">Service</div>
        <div className="w-[160px]">Status</div>
        <div className="w-[100px]">Due</div>
      </div>

      {/* Project cards */}
      <div className="flex flex-col gap-1.5">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-muted">
            No projects match the current filter.
          </div>
        )}
        {filtered.map((j) => (
          <ProjectCard
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
            agencySlug={agencySlug}
            clientSlug={clientSlug}
            accentColor={accentColor}
            primaryColor={primaryColor}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ job, expanded, onToggle, agencySlug, clientSlug, accentColor, primaryColor }) {
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
        className="w-full flex items-center gap-2.5 text-left px-3 lg:px-4 py-3 hover:bg-off transition-colors"
      >
        <ChevronRight
          className="w-4 h-4 text-muted shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        />
        {/* Meta block */}
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
          <div className="text-[0.72rem] text-muted mt-0.5">
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
      </button>

      {/* Expanded projects */}
      {expanded && (job.projects?.length ?? 0) > 0 && (
        <div className="border-t border-border bg-off/40">
          {job.projects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              agencySlug={agencySlug}
              clientSlug={clientSlug}
              accentColor={accentColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project, agencySlug, clientSlug, accentColor }) {
  const dotColor = {
    brief_pending:      "var(--color-navy)",
    in_progress:        "var(--color-teal)",
    in_review:          "var(--color-amber)",
    delivered:          "var(--color-green)",
    revision_requested: "var(--color-blue)",
    disputed:           "var(--color-red)",
  }[project.status] ?? "var(--color-muted)";

  return (
    <Link
      href={`/portal/${agencySlug}/${clientSlug}/projects/${project.id}`}
      className="flex items-center gap-2.5 px-3 lg:px-4 py-2.5 cursor-pointer border-b border-border last:border-0 hover:bg-teal-pale transition-colors"
    >
      <div
        className="w-2 h-2 rounded-full shrink-0 ml-4"
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
      <div className="hidden lg:block w-[100px] text-[0.82rem] text-body font-semibold">
        {project.due_date
          ? new Date(project.due_date).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })
          : "—"}
      </div>

      {/* Mobile: stacked badge */}
      <div className="lg:hidden">
        <StatusBadge status={project.status} />
      </div>
    </Link>
  );
}
