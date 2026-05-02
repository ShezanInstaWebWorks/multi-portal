"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

const MODES = {
  to_agency: {
    title: "Submit to agency for review",
    description:
      "Work is complete — submit to the agency so they can review before forwarding to their client.",
    buttonLabel: "Submit to agency",
    accentColor: "var(--color-teal)",
    accentShadow: "rgba(0,184,169,0.25)",
    borderColor: "var(--color-teal)",
  },
  to_client: {
    title: "Forward to client for review",
    description:
      "You've reviewed this work — forward it to your client so they can approve or request changes.",
    buttonLabel: "Forward to client",
    accentColor: "var(--color-amber)",
    accentShadow: "rgba(245,158,11,0.25)",
    borderColor: "var(--color-amber)",
  },
  direct: {
    title: "Submit for client review",
    description:
      "Ready for the client to sign off? Submit your deliverables and the client will be able to approve or request changes.",
    buttonLabel: "Submit for review",
    accentColor: "var(--color-amber)",
    accentShadow: "rgba(245,158,11,0.25)",
    borderColor: "var(--color-amber)",
  },
};

export function SubmitForReviewPanel({ projectId, hasFiles, mode = "direct" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const cfg = MODES[mode] ?? MODES.direct;

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/submit-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not submit for review");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <section
      className="mb-5 bg-white border border-border rounded-[16px] p-5 shadow-sm"
      style={{ borderLeft: `4px solid ${cfg.borderColor}` }}
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <h2 className="font-display text-[0.95rem] font-extrabold text-dark mb-1">
            {cfg.title}
          </h2>
          <p className="text-[0.82rem] text-muted">{cfg.description}</p>
        </div>
      </div>

      {!hasFiles && mode !== "to_agency" && (
        <div
          className="text-[0.78rem] rounded-[8px] px-3 py-2 mt-3 mb-1"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
            color: "var(--color-amber)",
          }}
        >
          Consider uploading deliverables before submitting — clients can review and
          download them from their portal.
        </div>
      )}

      {error && (
        <div
          className="text-[0.78rem] rounded-[8px] px-3 py-2 mt-3 mb-1"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "var(--color-red)",
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting || isPending}
        className="mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white disabled:opacity-40"
        style={{
          background: cfg.accentColor,
          boxShadow: `0 2px 10px ${cfg.accentShadow}`,
        }}
      >
        <Send className="w-3.5 h-3.5" />
        {submitting || isPending ? "Submitting…" : cfg.buttonLabel}
      </button>
    </section>
  );
}
