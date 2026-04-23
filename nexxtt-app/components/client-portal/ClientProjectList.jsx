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
          className="rounded-[16px] p-4 flex items-center gap-3.5 mb-5"
          style={{
            background: "white",
            border: "1.5px solid rgba(245,158,11,0.3)",
          }}
        >
          <span className="text-[1.1rem] shrink-0">⏰</span>
          <div className="flex-1 min-w-0">
            <div className="text-[0.85rem] font-bold text-dark">
              {actionNeeded} {actionNeeded === 1 ? "deliverable" : "deliverables"} need your approval
            </div>
            <div className="text-[0.73rem] text-muted mt-px">
              Review and sign off so the work can move forward.
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <Tab label={`Current (${current.length})`} active={tab === "current"} onClick={() => setTab("current")} />
        <Tab label={`Past (${past.length})`}       active={tab === "past"}    onClick={() => setTab("past")} />
      </div>

      {list.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted">
          Nothing {tab === "current" ? "active" : "completed"} yet.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
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
      className="px-5 py-2 rounded-full text-[0.82rem] font-semibold transition-all border"
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
      className="bg-white rounded-[20px] overflow-hidden transition-shadow duration-200"
      style={{
        border: "1px solid var(--color-border)",
        boxShadow: expanded
          ? "0 8px 28px rgba(11,31,58,0.12)"
          : "0 1px 4px rgba(11,31,58,0.06)",
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
        style={{
          background: expanded ? "var(--wl-primary)" : "transparent",
          color: expanded ? "white" : undefined,
        }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[0.9rem] shrink-0 transition-transform"
          style={{
            background: expanded ? "var(--wl-accent)" : "transparent",
            color: expanded ? "var(--wl-primary)" : "var(--color-muted)",
            border: expanded ? "none" : "1.5px solid var(--color-border)",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="text-[0.72rem] flex items-center gap-1.5 mb-0.5"
            style={{ color: expanded ? "rgba(255,255,255,0.5)" : "var(--color-muted)" }}
          >
            <span>{created}</span>
            <StatusBadge status={job.status} />
          </div>
          <div
            className="font-display text-[1rem] font-extrabold tracking-tight"
            style={{ color: expanded ? "white" : "var(--color-dark)" }}
          >
            {job.job_number}
          </div>
          <div
            className="text-[0.72rem] mt-0.5"
            style={{
              color: expanded ? "rgba(255,255,255,0.4)" : "var(--color-muted)",
            }}
          >
            {projectCount} project{projectCount === 1 ? "" : "s"}
            {job.is_rush && " · Rush delivery"}
          </div>
        </div>

        <div className="hidden sm:flex gap-1.5 shrink-0 flex-wrap max-w-[220px]">
          {serviceTags.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[0.72rem] whitespace-nowrap"
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
