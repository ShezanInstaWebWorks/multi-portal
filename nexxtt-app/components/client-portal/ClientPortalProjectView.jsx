"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, X, ChevronDown, ChevronUp, Download } from "lucide-react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { StatusBadge } from "@/components/shared/StatusBadge";

// ─── Stage pipeline ─────────────────────────────────────────────────────────────

const STAGE_FLOWS = {
  "website-design": [
    { key: "brief_pending",     label: "Brief submitted",   desc: "Your requirements are locked in." },
    { key: "in_progress",        label: "In production",     desc: "Your website is being designed and built." },
    { key: "agency_review",      label: "Agency review",     desc: "Your agency is reviewing before sending to you." },
    { key: "in_review",          label: "Your review",       desc: "Please review and approve or request changes." },
    { key: "revision_requested", label: "Revisions",         desc: "Your feedback is being addressed." },
    { key: "delivered",          label: "Delivered ✓",      desc: "Your project is complete." },
  ],
  "logo-design": [
    { key: "brief_pending",     label: "Brief submitted",   desc: "Direction + inspiration captured." },
    { key: "in_progress",        label: "Designing",         desc: "Your designer is drafting concepts." },
    { key: "agency_review",      label: "Agency review",     desc: "Your agency is reviewing before sending to you." },
    { key: "in_review",          label: "Choose concept",    desc: "Review the designs and pick your favourite." },
    { key: "revision_requested", label: "Refinement",        desc: "Your chosen concept is being polished." },
    { key: "delivered",          label: "Delivered ✓",      desc: "All files — SVG, PNG, PDF — are ready." },
  ],
  "brand-guidelines": [
    { key: "brief_pending",     label: "Brief submitted",   desc: "Brand inputs locked in." },
    { key: "in_progress",        label: "Creating system",   desc: "Full brand identity system being developed." },
    { key: "agency_review",      label: "Agency review",     desc: "Your agency is reviewing before sending to you." },
    { key: "in_review",          label: "Your review",       desc: "Full brand system ready for your sign-off." },
    { key: "revision_requested", label: "Adjustments",       desc: "Your feedback is being applied." },
    { key: "delivered",          label: "Delivered ✓",      desc: "Full brand bible PDF is ready." },
  ],
  "social-media-pack": [
    { key: "brief_pending",     label: "Brief submitted",   desc: "Voice + platforms captured." },
    { key: "in_progress",        label: "Drafting posts",    desc: "Content calendar and creative in production." },
    { key: "agency_review",      label: "Agency review",     desc: "Your agency is reviewing before sending to you." },
    { key: "in_review",          label: "Your approval",     desc: "Please review and approve the upcoming posts." },
    { key: "revision_requested", label: "Revisions",         desc: "Your feedback is being addressed." },
    { key: "delivered",          label: "Published ✓",      desc: "Posts are scheduled and going live." },
  ],
  "content-writing": [
    { key: "brief_pending",     label: "Brief submitted",   desc: "Topics and voice confirmed." },
    { key: "in_progress",        label: "Writing",           desc: "Your writer is working on the articles." },
    { key: "agency_review",      label: "Agency review",     desc: "Your agency is reviewing before sending to you." },
    { key: "in_review",          label: "Your review",       desc: "Review the drafts and provide feedback." },
    { key: "revision_requested", label: "Edits",             desc: "Your feedback is being applied." },
    { key: "delivered",          label: "Delivered ✓",      desc: "Final copy is ready for publishing." },
  ],
};

function flowFor(slug) {
  return STAGE_FLOWS[slug] ?? STAGE_FLOWS["website-design"];
}

function calcProgress(slug, status) {
  if (status === "delivered") return 100;
  const flow = flowFor(slug);
  const i = flow.findIndex((s) => s.key === status);
  return i <= 0 ? 0 : Math.round((i / (flow.length - 1)) * 100);
}

function stageIndex(slug, status) {
  const flow = flowFor(slug);
  const i = flow.findIndex((s) => s.key === status);
  return i >= 0 ? i : 0;
}

function currentStageFor(slug, status) {
  return flowFor(slug).find((s) => s.key === status) ?? flowFor(slug)[0];
}

function nextStagesFor(slug, status) {
  const flow = flowFor(slug);
  const i = flow.findIndex((s) => s.key === status);
  if (i < 0 || i >= flow.length - 1) return [];
  return flow.slice(i + 1);
}

// ─── Build timeline from available project data ──────────────────────────────────

function buildTimeline(project, brief, files) {
  const items = [];

  items.push({
    label: "Order placed",
    date: project.created_at,
    desc: "Your project was ordered by your agency.",
    files: [],
  });

  if (brief?.data || brief?.submitted_at) {
    items.push({
      label: "Brief confirmed",
      date: brief.submitted_at ?? null,
      desc: "Your project requirements were locked in.",
      files: [],
    });
  }

  const workStartedStatuses = ["in_progress", "agency_review", "in_review", "revision_requested", "delivered"];
  if (workStartedStatuses.includes(project.status)) {
    items.push({
      label: "Work started",
      date: project.start_date ?? null,
      desc: "Production began on your project.",
      files: [],
    });
  }

  if (["in_review", "revision_requested", "delivered"].includes(project.status) && files?.length > 0) {
    items.push({
      label: "Deliverables uploaded",
      date: null,
      desc: `${files.length} file${files.length === 1 ? "" : "s"} ready for you to download.`,
      files: files,
    });
  }

  if (project.status === "revision_requested") {
    items.push({
      label: `Revision requested (round ${project.revision_count ?? 1})`,
      date: project.updated_at ?? null,
      desc: "Your feedback has been sent and the team is working on changes.",
      files: [],
    });
  }

  if (project.status === "delivered") {
    items.push({
      label: "Approved & delivered",
      date: project.approved_at ?? null,
      desc: "Project complete. All files are ready to download.",
      files: [],
    });
  }

  return items;
}

// ─── Small helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function lighten(hex) {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.min(255, r + 35)}, ${Math.min(255, g + 35)}, ${Math.min(255, b + 35)})`;
  } catch {
    return hex;
  }
}

function heroGradientEnd(primary) {
  try {
    const r = parseInt(primary.slice(1, 3), 16);
    const g = parseInt(primary.slice(3, 5), 16);
    const b = parseInt(primary.slice(5, 7), 16);
    const f = 1.45;
    return `rgb(${Math.min(255, Math.round(r * f))}, ${Math.min(255, Math.round(g * f))}, ${Math.min(255, Math.round(b * f))})`;
  } catch {
    return "#1a3d6e";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────────

function Accordion({ title, badge, badgeColor = "teal", defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  const badgeCls = {
    teal:  "bg-teal-pale text-teal border-teal/25",
    amber: "bg-amber/10 text-amber border-amber/25",
    blue:  "bg-blue/10 text-blue border-blue/25",
    muted: "bg-off text-muted border-border",
  };

  return (
    <div className="bg-white border border-border rounded-[16px] overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-off/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-display text-[0.88rem] font-extrabold text-dark">{title}</span>
          {badge && (
            <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeCls[badgeColor] ?? badgeCls.muted}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <span className="text-[0.72rem] text-muted hidden sm:block">
            {open ? "Collapse" : "Expand"}
          </span>
          {open
            ? <ChevronUp className="w-3.5 h-3.5 text-muted" />
            : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
        </div>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

function TimelineItem({ label, date, desc, files }) {
  return (
    <div className="flex gap-3.5 px-5 py-4 border-b border-border last:border-0">
      <div
        className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.6rem] font-bold shrink-0 mt-0.5"
        style={{ background: "var(--color-teal)", color: "white" }}
      >
        ✓
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap mb-1">
          <span className="text-[0.85rem] font-bold text-dark">{label}</span>
          {date && <span className="text-[0.7rem] font-semibold text-muted">{fmtDate(date)}</span>}
        </div>
        <p className="text-[0.78rem] text-muted leading-relaxed">{desc}</p>
        {files?.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2.5">
            {files.map((f) => (
              <a
                key={f.id}
                href={f.signedUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[0.72rem] px-2.5 py-1 rounded-full bg-off border border-border text-muted hover:border-teal hover:text-teal transition-colors"
              >
                <Download className="w-2.5 h-2.5" />
                {f.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WhatHappeningNow({ current, next }) {
  return (
    <div>
      <div className="px-5 py-5">
        <div
          className="text-[0.65rem] font-bold uppercase text-muted mb-2"
          style={{ letterSpacing: "0.1em" }}
        >
          Right now
        </div>
        <div className="font-display text-[1rem] font-extrabold text-dark mb-1.5">
          {current.label}
        </div>
        <p className="text-[0.82rem] text-muted leading-relaxed">{current.desc}</p>
      </div>

      {next.length > 0 && (
        <div className="border-t border-border">
          <div
            className="px-5 pt-3 pb-2 text-[0.65rem] font-bold uppercase text-muted"
            style={{ letterSpacing: "0.1em" }}
          >
            What's next
          </div>
          {next.map((stage, i) => (
            <div
              key={stage.key}
              className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] font-bold shrink-0 border"
                style={
                  i === 0
                    ? { background: "var(--color-navy)", color: "white", borderColor: "transparent" }
                    : { background: "var(--color-off)", color: "var(--color-muted)", borderColor: "var(--color-border)" }
                }
              >
                {i + 2}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.82rem] font-bold text-dark">{stage.label}</div>
                <div className="text-[0.73rem] text-muted mt-0.5">{stage.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewActionPanel({ projectId, agencyName }) {
  const router = useRouter();
  const [mode, setMode] = useState("idle");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  async function approve() {
    setPending("approve");
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/approve`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    router.refresh();
  }

  async function submitRevision() {
    if (note.trim().length < 5) {
      setError("Please describe what you'd like changed (at least 5 characters).");
      return;
    }
    setPending("revision");
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    router.refresh();
  }

  if (mode === "revision-form") {
    return (
      <div
        className="rounded-[16px] p-5"
        style={{ background: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.3)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber" />
            <span className="font-display font-extrabold text-dark text-[0.9rem]">
              What should we change?
            </span>
          </div>
          <button
            onClick={() => { setMode("idle"); setError(null); setNote(""); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Cancel"
          >
            <X className="w-3.5 h-3.5 text-muted" />
          </button>
        </div>
        <p className="text-[0.78rem] text-muted mb-3 leading-relaxed">
          Be specific — your feedback will go straight to {agencyName}.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3 py-2.5 border-[1.5px] border-border rounded-[10px] text-[0.85rem] text-dark outline-none focus:border-amber resize-y min-h-[88px] mb-2"
          placeholder="e.g. Can we try the hero in a warmer tone? And please add a stronger call-to-action button."
        />
        {error && <p className="text-[0.78rem] text-red mb-2">{error}</p>}
        <div className="flex gap-2 justify-end flex-wrap">
          <button
            onClick={() => { setMode("idle"); setError(null); setNote(""); }}
            className="px-4 py-2 rounded-[10px] text-[0.82rem] font-semibold bg-white border border-border text-body hover:border-dark transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submitRevision}
            disabled={pending !== null || note.trim().length < 5}
            className="px-5 py-2 rounded-[10px] text-[0.82rem] font-extrabold text-white disabled:opacity-50"
            style={{ background: "var(--color-amber)", boxShadow: "0 2px 10px rgba(245,158,11,0.25)" }}
          >
            {pending === "revision" ? "Sending…" : "Send feedback →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[16px] p-5"
      style={{ background: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.3)" }}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="text-[1.2rem] shrink-0 mt-0.5">⏰</div>
        <div className="flex-1 min-w-[180px]">
          <div className="font-display font-extrabold text-dark text-[0.95rem]">
            This project is waiting for your review
          </div>
          <p className="text-[0.78rem] text-muted mt-1 leading-relaxed">
            Review the delivered work, then approve it or let {agencyName} know what you'd like changed.
          </p>
          {error && <p className="text-[0.78rem] text-red mt-2">{error}</p>}
        </div>
        <div className="flex gap-2 flex-wrap shrink-0 mt-1">
          <button
            onClick={approve}
            disabled={pending !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[0.82rem] font-extrabold text-white disabled:opacity-60"
            style={{ background: "var(--color-green)", boxShadow: "0 2px 10px rgba(16,185,129,0.25)" }}
          >
            <Check className="w-3.5 h-3.5" />
            {pending === "approve" ? "Approving…" : "Approve ✓"}
          </button>
          <button
            onClick={() => setMode("revision-form")}
            disabled={pending !== null}
            className="px-4 py-2.5 rounded-[10px] text-[0.82rem] font-semibold bg-white border border-border text-body hover:border-dark transition-colors disabled:opacity-60"
          >
            Request changes
          </button>
        </div>
      </div>
    </div>
  );
}

function DeliverablesSection({ files }) {
  if (!files?.length) return null;
  return (
    <div className="bg-white border border-border rounded-[16px] overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <span className="font-display text-[0.88rem] font-extrabold text-dark">Deliverables</span>
        <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-teal-pale text-teal border border-teal/25">
          {files.length} file{files.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {files.map((f) => (
          <a
            key={f.id}
            href={f.signedUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-[10px] bg-off border border-border hover:border-teal hover:bg-teal-pale transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-pale border border-teal/25 flex items-center justify-center text-[0.9rem] shrink-0">
              📄
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.85rem] font-semibold text-dark truncate">{f.name}</div>
              {f.size_bytes && (
                <div className="text-[0.72rem] text-muted">
                  {(f.size_bytes / 1024).toFixed(0)} KB
                </div>
              )}
            </div>
            <Download className="w-4 h-4 text-muted group-hover:text-teal transition-colors shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

function RevisionBanner({ revisionNote, agencyName }) {
  if (!revisionNote?.note) return null;
  return (
    <div
      className="rounded-[16px] p-4"
      style={{
        background: "rgba(59,130,246,0.06)",
        border: "1.5px solid rgba(59,130,246,0.25)",
        borderLeft: "4px solid var(--color-blue, #3b82f6)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5 text-[1rem]"
          style={{ background: "rgba(59,130,246,0.12)" }}
        >
          ↻
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-display font-extrabold text-dark text-[0.9rem]">
              Revision in progress
            </span>
            {revisionNote.requestedAt && (
              <span className="text-[0.72rem] text-muted">{fmtDate(revisionNote.requestedAt)}</span>
            )}
          </div>
          <p className="text-[0.85rem] text-body whitespace-pre-wrap leading-relaxed">
            {revisionNote.note}
          </p>
          <p className="text-[0.75rem] text-muted mt-2">
            {agencyName} has received your feedback and is working on the changes.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────────

export function ClientPortalProjectView({
  project,
  service,
  brief,
  files,
  job,
  brand,
  agencySlug,
  clientSlug,
  conversationId,
  initialMessages,
  currentUserId,
  revisionNote,
}) {
  const primary    = brand?.primary_colour  ?? "#0B1F3A";
  const accent     = brand?.accent_colour   ?? "#00B8A9";
  const agencyName = brand?.display_name    ?? "your agency";

  const pct        = calcProgress(service?.slug, project.status);
  const currStage  = currentStageFor(service?.slug, project.status);
  const nextList   = nextStagesFor(service?.slug, project.status);
  const stageIdx   = stageIndex(service?.slug, project.status);
  const timeline   = buildTimeline(project, brief, files);

  const isInReview         = project.status === "in_review";
  const isRevisionReq      = project.status === "revision_requested";
  const isDelivered        = ["delivered", "approved"].includes(project.status);
  const showDeliverables   = files?.length > 0 && (isInReview || isDelivered);

  return (
    <div className="flex flex-col" style={{ background: "var(--color-off)", minHeight: "100%" }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="px-5 sm:px-7 py-6 shrink-0"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${heroGradientEnd(primary)} 100%)`,
        }}
      >
        {/* Back */}
        <Link
          href={`/portal/${agencySlug}/${clientSlug}`}
          className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold mb-5 transition-opacity hover:opacity-90"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          ← My Projects
        </Link>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[1.25rem] shrink-0"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              {service?.icon ?? "📦"}
            </div>
            <div className="min-w-0">
              <div
                className="text-[0.65rem] font-bold uppercase mb-1"
                style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}
              >
                {service?.name ?? "Project"} · #{job?.job_number ?? "—"}
              </div>
              <div
                className="font-display text-[1.3rem] font-extrabold leading-tight"
                style={{ color: "white", letterSpacing: "-0.025em" }}
              >
                {service?.name ?? "Project"}
              </div>
              <div className="text-[0.82rem] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                Managed by {agencyName}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            {project.due_date && (
              <>
                <div
                  className="text-[0.62rem] font-bold uppercase mb-1"
                  style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}
                >
                  Due date
                </div>
                <div className="font-display text-[0.95rem] font-bold text-white mb-1.5">
                  {new Date(project.due_date).toLocaleDateString("en-AU", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </div>
              </>
            )}
            <StatusBadge status={project.status} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div
            className="flex justify-between text-[0.7rem] mb-1.5 font-semibold"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
          <div
            className="h-[5px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${accent}, ${lighten(accent)})`,
                transition: "width 0.7s cubic-bezier(.4,0,.2,1)",
              }}
            />
          </div>
        </div>

        {/* Stage pill */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[0.75rem]"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.13)",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          <span>Stage {stageIdx + 1}</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
          <strong style={{ color: "white" }}>{currStage.label}</strong>
          {nextList.length > 0 && (
            <>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
              <span>{nextList[0].label}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-5 pb-24 lg:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">

          {/* ── Left: project detail ── */}
          <div className="flex flex-col gap-4">

            {/* 1. Review action — prominent at top when client needs to act */}
            {isInReview && (
              <ReviewActionPanel projectId={project.id} agencyName={agencyName} />
            )}

            {/* 2. Revision in progress banner */}
            {isRevisionReq && (
              <RevisionBanner revisionNote={revisionNote} agencyName={agencyName} />
            )}

            {/* 3. Deliverables to review/download */}
            {showDeliverables && <DeliverablesSection files={files} />}

            {/* 4. What's been done */}
            <Accordion
              title="What's been done"
              badge={`${timeline.length} update${timeline.length === 1 ? "" : "s"}`}
              badgeColor="teal"
              defaultOpen={false}
            >
              {timeline.map((item, i) => (
                <TimelineItem key={i} {...item} />
              ))}
            </Accordion>

            {/* 5. What's happening now — hidden when delivered */}
            {!isDelivered && (
              <Accordion
                title="What's happening now"
                badge={currStage.label}
                badgeColor={isInReview ? "amber" : "teal"}
                defaultOpen={true}
              >
                <WhatHappeningNow current={currStage} next={nextList} />
              </Accordion>
            )}

          </div>

          {/* ── Right: chat (sticky) ── */}
          <div className="lg:sticky lg:top-5">
            {conversationId ? (
              <div className="bg-white border border-border rounded-[16px] overflow-hidden shadow-sm">
                <div
                  className="flex items-center gap-3 px-5 py-3.5 border-b border-border"
                  style={{ background: "var(--color-off)" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[0.65rem] font-bold shrink-0"
                    style={{ background: primary, color: accent }}
                  >
                    {(agencyName.charAt(0) || "A").toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[0.85rem] font-bold text-dark">{agencyName}</div>
                    <div className="text-[0.7rem] text-muted">Replies within a few hours</div>
                  </div>
                </div>
                <ChatPanel
                  conversationId={conversationId}
                  initialMessages={initialMessages ?? []}
                  currentUserId={currentUserId}
                  placeholder={`Message ${agencyName}…`}
                  projectStatus={project.status}
                />
              </div>
            ) : (
              <div className="bg-white border border-border rounded-[16px] p-5 shadow-sm text-center">
                <div className="text-2xl mb-2 opacity-30">💬</div>
                <p className="text-sm text-muted">No conversation yet.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
