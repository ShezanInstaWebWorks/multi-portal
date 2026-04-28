"use client";

import { useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { OrderDrawer } from "@/components/admin/OrderDrawer";

const PAST_STATUSES = new Set(["delivered"]);

export function ClientProjectList({ jobs, basePath }) {
  const [tab, setTab] = useState("current");
  const [expanded, setExpanded] = useState(() => {
    // Default: expand the first current job.
    const first = jobs.find((j) => !PAST_STATUSES.has(j.status));
    return new Set(first ? [first.id] : []);
  });
  const [active, setActive] = useState(null); // { projectId, label }

  const { current, past } = useMemo(() => {
    const current = [];
    const past = [];
    for (const j of jobs) {
      (PAST_STATUSES.has(j.status) ? past : current).push(j);
    }
    return { current, past };
  }, [jobs]);

  const actionNeeded = useMemo(
    () =>
      jobs
        .flatMap((j) => j.projects ?? [])
        .filter((p) => p.status === "in_review").length,
    [jobs]
  );

  const list = tab === "current" ? current : past;

  return (
    <div>
      {/* Action needed banner */}
      {actionNeeded > 0 && (
        <div
          className="rounded-[10px] px-3 py-2 flex items-center gap-2 mb-3"
          style={{
            background: "white",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          <span className="text-[0.95rem] shrink-0">⏰</span>
          <div className="flex-1 min-w-0 text-[0.78rem]">
            <span className="font-bold text-dark">
              {actionNeeded} {actionNeeded === 1 ? "deliverable" : "deliverables"}
            </span>
            <span className="text-muted"> need your approval — review to keep work moving.</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <Tab label={`Current (${current.length})`} active={tab === "current"} onClick={() => setTab("current")} />
        <Tab label={`Past (${past.length})`}       active={tab === "past"}    onClick={() => setTab("past")} />
      </div>

      {list.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted">
          Nothing {tab === "current" ? "active" : "completed"} yet.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {list.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              basePath={basePath}
              expanded={expanded.has(j.id)}
              onToggle={() =>
                setExpanded((s) => {
                  const n = new Set(s);
                  if (n.has(j.id)) n.delete(j.id);
                  else n.add(j.id);
                  return n;
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
      )}

      <OrderDrawer
        open={!!active}
        src={active?.projectId && basePath ? `${basePath}/projects/${active.projectId}?embed=1` : null}
        openHref={active?.projectId && basePath ? `${basePath}/projects/${active.projectId}` : null}
        title={active?.label ?? null}
        subtitle="Project"
        onClose={() => setActive(null)}
      />
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1 rounded-full text-[0.78rem] font-semibold transition-all border"
      style={
        active
          ? {
              background: "var(--wl-primary)",
              borderColor: "var(--wl-primary)",
              color: "white",
            }
          : {
              background: "white",
              borderColor: "var(--color-border)",
              color: "var(--color-muted)",
            }
      }
    >
      {label}
    </button>
  );
}

function JobCard({ job, basePath, expanded, onToggle, onOpenProject }) {
  const created = new Date(job.created_at).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const projectCount = job.projects?.length ?? 0;
  const serviceTags = (job.projects ?? []).slice(0, 3).map((p) => p.services);

  return (
    <div
      className="bg-white rounded-[12px] overflow-hidden transition-shadow duration-200"
      style={{
        border: "1px solid var(--color-border)",
        boxShadow: expanded
          ? "0 4px 16px rgba(11,31,58,0.10)"
          : "0 1px 3px rgba(11,31,58,0.05)",
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
        style={{
          background: expanded ? "var(--wl-primary)" : "transparent",
          color: expanded ? "white" : undefined,
        }}
      >
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-transform"
          style={{
            background: expanded ? "var(--wl-accent)" : "transparent",
            color: expanded ? "var(--wl-primary)" : "var(--color-muted)",
            border: expanded ? "none" : "1.5px solid var(--color-border)",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span
            className="font-display text-[0.88rem] font-extrabold tracking-tight"
            style={{ color: expanded ? "white" : "var(--color-dark)" }}
          >
            {job.job_number}
          </span>
          <StatusBadge status={job.status} />
          <span
            className="text-[0.7rem]"
            style={{ color: expanded ? "rgba(255,255,255,0.55)" : "var(--color-muted)" }}
          >
            {created} · {projectCount} project{projectCount === 1 ? "" : "s"}
            {job.is_rush && " · rush"}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1 shrink-0 flex-wrap justify-end max-w-[300px]">
          {serviceTags.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-[1px] rounded-full text-[0.68rem] whitespace-nowrap"
              style={{
                background: expanded ? "rgba(255,255,255,0.08)" : "var(--color-off)",
                border: expanded
                  ? "1px solid rgba(255,255,255,0.12)"
                  : "1px solid var(--color-border)",
                color: expanded ? "rgba(255,255,255,0.55)" : "var(--color-muted)",
              }}
            >
              <span>{s?.icon ?? "•"}</span>
              <span>{s?.name ?? "Service"}</span>
            </span>
          ))}
          {projectCount > serviceTags.length && (
            <span
              className="text-[0.68rem]"
              style={{ color: expanded ? "rgba(255,255,255,0.55)" : "var(--color-muted)" }}
            >
              +{projectCount - serviceTags.length}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {(job.projects ?? []).map((p, i) => (
            <ProjectRow
              key={p.id}
              project={p}
              isLast={i === (job.projects?.length ?? 0) - 1}
              onOpen={() => onOpenProject(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project, isLast, onOpen }) {
  const due = project.due_date
    ? new Date(project.due_date).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
      })
    : "—";
  const needsAction = project.status === "in_review";
  return (
    <div
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open project ${project.services?.name ?? ""}`}
      className={`flex items-center gap-2.5 py-1.5 px-3 lg:px-4 pl-13 transition-colors hover:bg-off/60 cursor-pointer ${
        isLast ? "" : "border-b border-border"
      }`}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          background: needsAction ? "var(--color-amber)" : "var(--wl-accent)",
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[0.88rem] font-semibold text-dark">
          {project.services?.name ?? "Project"}
        </div>
        <div className="text-[0.72rem] text-muted mt-px">
          {project.is_rush ? "Rush delivery" : `Due ${due}`}
          {needsAction && " · Your review is needed"}
        </div>
      </div>
      <div className="hidden sm:block w-[160px]">
        <StatusBadge status={project.status} />
      </div>
      <div className="hidden sm:block w-[72px] text-[0.78rem] text-muted">
        {due}
      </div>
      <div className="w-[88px] text-right">
        <button
          className="text-[0.72rem] font-semibold px-2.5 py-1 rounded-md transition-colors"
          style={
            needsAction
              ? {
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  color: "var(--color-amber)",
                }
              : {
                  background: "var(--color-off)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-muted)",
                }
          }
        >
          {needsAction ? "Review →" : "View →"}
        </button>
      </div>
    </div>
  );
}
