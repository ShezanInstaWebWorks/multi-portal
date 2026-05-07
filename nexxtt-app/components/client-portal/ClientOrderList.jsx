"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Flag } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";

function deriveOrderBadge(projects) {
  if (!projects?.length) return null;
  const reviewCount = projects.filter((p) => p.status === "in_review").length;
  if (reviewCount > 0) return { label: `${reviewCount} to review`, color: "amber" };
  if (projects.every((p) => ["delivered", "approved"].includes(p.status)))
    return { label: "Delivered", color: "green" };
  if (projects.some((p) => p.status === "disputed"))
    return { label: "Disputed", color: "red", icon: Flag };
  if (projects.some((p) => p.status === "in_progress" || p.status === "agency_review"))
    return { label: "In Progress", color: "teal" };
  return { label: "Brief Pending", color: "navy" };
}

const DOT_COLOR = {
  in_review:          "var(--color-amber)",
  in_progress:        "var(--color-teal)",
  agency_review:      "var(--color-blue)",
  delivered:          "var(--color-green)",
  approved:           "var(--color-green)",
  revision_requested: "var(--color-blue)",
  disputed:           "var(--color-red)",
  brief_pending:      "var(--color-navy)",
};

const BADGE_STYLE = {
  amber: "bg-amber/10 text-amber border-amber/25",
  green: "bg-green/10 text-green border-green/20",
  teal:  "bg-teal/10 text-teal border-teal/20",
  red:   "bg-red/10 text-red border-red/20",
  navy:  "bg-navy/10 text-navy border-navy/20",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short" });
}

export function ClientOrderList({ jobs, agencySlug, clientSlug, accentColor }) {
  // Open orders that need action by default; otherwise open the first one.
  const [openSet, setOpenSet] = useState(() => {
    const s = new Set();
    for (const j of jobs) {
      if ((j.projects ?? []).some((p) => p.status === "in_review")) s.add(j.id);
    }
    if (s.size === 0 && jobs.length > 0) s.add(jobs[0].id);
    return s;
  });

  function toggle(id) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (!jobs.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job) => {
        const projects = job.projects ?? [];
        const isOpen = openSet.has(job.id);
        const badge = deriveOrderBadge(projects);
        const hasAction = projects.some((p) => p.status === "in_review");
        const serviceNames = [
          ...new Set(projects.map((p) => p.services?.name).filter(Boolean)),
        ];

        return (
          <div
            key={job.id}
            className="bg-white border rounded-[16px] overflow-hidden shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: hasAction ? "rgba(245,158,11,0.35)" : "var(--color-border)" }}
          >
            {/* ── Order header (clickable) ── */}
            <button
              type="button"
              onClick={() => toggle(job.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                isOpen ? "" : "hover:bg-off"
              }`}
              style={isOpen ? { background: "var(--color-navy)" } : undefined}
            >
              {/* Chevron */}
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isOpen
                    ? "border-teal text-navy"
                    : "border-border text-muted bg-white"
                }`}
                style={isOpen ? { background: accentColor ?? "var(--color-teal)" } : undefined}
              >
                {isOpen
                  ? <ChevronUp className="w-3.5 h-3.5" />
                  : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {/* Order meta */}
              <div className="flex-1 min-w-0">
                <div
                  className="flex items-center gap-1.5 flex-wrap text-[0.7rem] font-semibold mb-0.5"
                  style={{ color: isOpen ? "rgba(255,255,255,0.4)" : "var(--color-muted)" }}
                >
                  <span>#{job.job_number}</span>
                  <span>·</span>
                  <span>{fmtDate(job.created_at)}</span>
                  {job.is_rush && (
                    <span style={{ color: isOpen ? "rgba(245,158,11,0.8)" : "var(--color-amber)" }}>
                      · Rush
                    </span>
                  )}
                </div>
                <div
                  className="font-display font-extrabold text-[0.98rem] truncate"
                  style={{ color: isOpen ? "white" : "var(--color-dark)" }}
                >
                  {serviceNames.join(" · ") || "Order"}
                </div>
                <div
                  className="text-[0.7rem] mt-0.5"
                  style={{ color: isOpen ? "rgba(255,255,255,0.3)" : "var(--color-muted)" }}
                >
                  {projects.length} service{projects.length === 1 ? "" : "s"}
                </div>
              </div>

              {/* Status badge */}
              {badge && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.72rem] font-bold border shrink-0 ${BADGE_STYLE[badge.color] ?? BADGE_STYLE.navy}`}
                >
                  {badge.icon && <badge.icon className="w-3.5 h-3.5" />}
                  {badge.label}
                </span>
              )}
            </button>

            {/* ── Projects inside the order ── */}
            {isOpen && (
              <div className="border-t border-border">
                {/* Desktop column headers */}
                <div className="hidden md:flex items-center px-5 py-2 bg-off border-b border-border">
                  <div className="flex-1 text-[0.65rem] font-bold uppercase text-muted" style={{ letterSpacing: "0.08em" }}>
                    Service
                  </div>
                  <div className="w-24 text-[0.65rem] font-bold uppercase text-muted shrink-0" style={{ letterSpacing: "0.08em" }}>
                    Due
                  </div>
                  <div className="w-36 text-[0.65rem] font-bold uppercase text-muted shrink-0" style={{ letterSpacing: "0.08em" }}>
                    Status
                  </div>
                  <div className="w-20 shrink-0" />
                </div>

                {projects.map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-5 py-3.5 hover:bg-teal-pale transition-colors ${
                      i < projects.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    {/* Status dot */}
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: DOT_COLOR[p.status] ?? "var(--color-border)" }}
                    />

                    {/* Service icon + name */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="text-[1rem] shrink-0">{p.services?.icon ?? "•"}</div>
                      <div className="font-semibold text-dark text-[0.85rem] truncate">
                        {p.services?.name ?? "Service"}
                      </div>
                    </div>

                    {/* Due date — desktop */}
                    <div className="w-24 text-[0.82rem] text-muted shrink-0 hidden md:block">
                      {fmtDate(p.due_date)}
                    </div>

                    {/* Status badge — desktop */}
                    <div className="w-36 shrink-0 hidden md:block">
                      <StatusBadge status={p.status} />
                    </div>

                    {/* Mobile status */}
                    <div className="md:hidden shrink-0">
                      <StatusBadge status={p.status} />
                    </div>

                    {/* Action button */}
                    <div className="w-20 shrink-0 text-right">
                      <Link
                        href={`/portal/${agencySlug}/${clientSlug}/projects/${p.id}`}
                        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-[8px] text-[0.72rem] font-bold border transition-colors ${
                          p.status === "in_review"
                            ? "bg-amber/10 border-amber/25 text-amber hover:bg-amber hover:text-white"
                            : "bg-off border-border text-muted hover:border-teal hover:text-teal"
                        }`}
                      >
                        {p.status === "in_review" ? "Review →" : "View →"}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
