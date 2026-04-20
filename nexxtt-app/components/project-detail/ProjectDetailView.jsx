"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCents } from "@/lib/money";
import { ProjectStages, progressPct } from "./ProjectStages";

/**
 * Shared detail view for a single project.
 *
 * viewer:
 *   - "agency"        → shows cost/retail/profit, back-to-order
 *   - "direct_client" → shows retail only
 *   - "agency_client" → shows retail only, plus Approve / Request revision buttons
 *                        when status is in_review
 */
export function ProjectDetailView({
  viewer, project, service, brief, files, job, backHref, backLabel,
}) {
  const pct = progressPct(service?.slug, project.status);
  const profit = (project.retail_price_cents ?? 0) - (project.cost_price_cents ?? 0);
  const showCost = viewer === "agency";
  const showApprove = viewer === "agency_client" && project.status === "in_review";

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1100px] mx-auto w-full">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {backLabel}
      </Link>

      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-[18px] p-6 mb-5 text-white shadow-md"
        style={{
          background:
            "linear-gradient(135deg, var(--color-navy) 0%, #152d52 60%, var(--color-navy) 100%)",
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap relative z-[1]">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[1.3rem] flex-shrink-0"
              style={{ background: "rgba(0,184,169,0.18)" }}
            >
              {service?.icon ?? "•"}
            </div>
            <div className="min-w-0">
              <div
                className="text-[0.65rem] font-bold uppercase text-white/40 mb-1"
                style={{ letterSpacing: "0.12em" }}
              >
                {job?.job_number ?? "PROJECT"}
              </div>
              <div className="font-display text-[1.5rem] font-extrabold tracking-tight">
                {service?.name ?? "Project"}
              </div>
              <div className="text-[0.82rem] text-white/60 mt-1 flex items-center gap-2 flex-wrap">
                <StatusBadge status={project.status} />
                {project.due_date && (
                  <span>
                    Due{" "}
                    {new Date(project.due_date).toLocaleDateString("en-AU", {
                      day: "2-digit", month: "short",
                    })}
                  </span>
                )}
                {project.is_rush && (
                  <span
                    className="inline-flex items-center px-2 py-[2px] rounded-full text-[0.62rem] font-bold"
                    style={{
                      background: "rgba(245,158,11,0.15)",
                      color: "var(--color-amber)",
                      border: "1px solid rgba(245,158,11,0.3)",
                    }}
                  >
                    RUSH
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div
              className="text-[0.65rem] font-bold uppercase text-white/40 mb-1"
              style={{ letterSpacing: "0.12em" }}
            >
              {showCost ? "YOUR PROFIT" : "PROJECT VALUE"}
            </div>
            <div
              className="font-display text-[1.6rem] font-extrabold"
              style={{ color: showCost ? "var(--color-teal)" : "white" }}
            >
              {showCost ? formatCents(profit) : formatCents(project.retail_price_cents)}
            </div>
            {showCost && (
              <div className="text-[0.72rem] text-white/50 mt-0.5">
                Cost {formatCents(project.cost_price_cents)} · Retail{" "}
                {formatCents(project.retail_price_cents)}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 relative z-[1]">
          <div className="flex justify-between text-[0.7rem] text-white/50 mb-1.5 font-semibold">
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background:
                  "linear-gradient(90deg, var(--color-teal), var(--color-teal-l))",
                transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Client actions */}
      {showApprove && (
        <div
          className="rounded-[14px] p-4 mb-5 flex items-center gap-3 flex-wrap"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1.5px solid rgba(245,158,11,0.3)",
          }}
        >
          <div className="text-[1.1rem] flex-shrink-0">⏰</div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.88rem] font-bold text-dark">
              This project is waiting for your review
            </div>
            <div className="text-[0.75rem] text-muted mt-px">
              Sign off to unlock the next stage, or request revisions with a
              quick note.
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              className="px-4 py-2 rounded-[10px] text-[0.82rem] font-extrabold text-white"
              style={{
                background: "var(--color-green)",
                boxShadow: "0 2px 10px rgba(16,185,129,0.25)",
              }}
            >
              ✓ Approve
            </button>
            <button
              className="px-4 py-2 rounded-[10px] text-[0.82rem] font-semibold bg-white border border-border text-body hover:border-navy transition-colors"
            >
              Request revision
            </button>
          </div>
        </div>
      )}

      {/* 2-col: stages + (brief / files) */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
        {/* Stages */}
        <section className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
          <h2 className="font-display text-[0.95rem] font-extrabold text-dark mb-4">
            Stages
          </h2>
          <ProjectStages serviceSlug={service?.slug} status={project.status} />
        </section>

        {/* Brief + Deliverables + Activity */}
        <div className="flex flex-col gap-4">
          <section className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
            <h2 className="font-display text-[0.95rem] font-extrabold text-dark mb-3">
              Brief
            </h2>
            {brief?.data ? (
              <BriefRenderer data={brief.data} />
            ) : (
              <p className="text-sm text-muted">No brief on file.</p>
            )}
            <div className="text-[0.7rem] text-muted mt-3 pt-3 border-t border-border">
              {brief?.submitted_at
                ? `Submitted ${new Date(brief.submitted_at).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}`
                : "—"}
            </div>
          </section>

          <section className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
            <h2 className="font-display text-[0.95rem] font-extrabold text-dark mb-3">
              Deliverables
            </h2>
            {(!files || files.length === 0) ? (
              <div className="py-6 text-center text-sm text-muted">
                <div className="text-2xl mb-2 opacity-30">📦</div>
                No files yet — they&apos;ll appear here once the project is delivered.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-3 rounded-[10px] border border-border hover:border-teal/50 hover:bg-off transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[1rem] flex-shrink-0"
                      style={{ background: "var(--color-teal-pale)", color: "var(--color-teal)" }}
                    >
                      📄
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.85rem] font-semibold text-dark truncate">
                        {f.name}
                      </div>
                      <div className="text-[0.72rem] text-muted">
                        {f.size_bytes ? `${Math.round(f.size_bytes / 1024)} KB · ` : ""}
                        {new Date(f.uploaded_at).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                    <button
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.72rem] font-semibold bg-off text-body hover:bg-lg"
                      title="Download (signed URL flow coming in the Storage session)"
                    >
                      <Download className="w-3 h-3" />
                      Get
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
            <h2 className="font-display text-[0.95rem] font-extrabold text-dark mb-3">
              Activity
            </h2>
            <div className="flex flex-col gap-3">
              <ActivityItem
                color="var(--color-teal)"
                title={`Status: ${project.status.replace(/_/g, " ")}`}
                time={project.updated_at ? new Date(project.updated_at).toLocaleString("en-AU") : "—"}
              />
              <ActivityItem
                color="var(--color-muted)"
                title="Project created"
                time={new Date(project.created_at).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              />
            </div>
            <div className="text-[0.7rem] text-muted mt-3 pt-3 border-t border-border">
              A full activity timeline with comments lands in the comments-feature session.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function BriefRenderer({ data }) {
  // Display a pleasant read-only view of the jsonb brief.
  const keys = Object.keys(data ?? {});
  if (keys.length === 0) return <p className="text-sm text-muted">Empty brief.</p>;
  return (
    <dl className="flex flex-col gap-3 text-sm">
      {keys.map((k) => (
        <div key={k} className="flex flex-col">
          <dt
            className="text-[0.72rem] font-bold uppercase text-muted mb-1"
            style={{ letterSpacing: "0.08em" }}
          >
            {humanise(k)}
          </dt>
          <dd className="text-body whitespace-pre-wrap leading-relaxed">
            {stringify(data[k])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function humanise(k) {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function stringify(v) {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

function ActivityItem({ color, title, time }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
        style={{ background: color, boxShadow: `0 0 4px ${color}` }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[0.85rem] font-semibold text-dark">{title}</div>
        <div className="text-[0.7rem] text-muted">{time}</div>
      </div>
    </div>
  );
}
