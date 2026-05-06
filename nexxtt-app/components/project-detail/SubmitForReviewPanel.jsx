"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, RotateCcw } from "lucide-react";

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
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [sendingChanges, setSendingChanges] = useState(false);

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

  async function requestChanges() {
    if (changeNote.trim().length < 5) {
      setError("Please describe what needs to change (at least 5 characters).");
      return;
    }
    setSendingChanges(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/agency-revision-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: changeNote.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setSendingChanges(false);
    if (!res.ok) {
      setError(data.error ?? "Could not send revision request");
      return;
    }
    setRequestingChanges(false);
    setChangeNote("");
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

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <button
          onClick={submit}
          disabled={submitting || isPending}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white disabled:opacity-40"
          style={{
            background: cfg.accentColor,
            boxShadow: `0 2px 10px ${cfg.accentShadow}`,
          }}
        >
          <Send className="w-3.5 h-3.5" />
          {submitting || isPending ? "Submitting…" : cfg.buttonLabel}
        </button>

        {mode === "to_client" && (
          <button
            onClick={() => { setRequestingChanges((v) => !v); setError(null); }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-sm font-semibold border border-border text-body hover:border-red hover:text-red transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Request changes from nexxtt.io
          </button>
        )}
      </div>

      {mode === "to_client" && requestingChanges && (
        <div
          className="mt-4 rounded-[12px] p-4"
          style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <p className="text-[0.82rem] font-semibold text-dark mb-2">
            Describe what needs to be changed
          </p>
          <textarea
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            rows={3}
            placeholder="e.g. The logo colours don't match our brand guide, please adjust…"
            className="w-full px-3 py-2 text-[0.85rem] border border-border rounded-[8px] outline-none resize-none focus:border-red"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={requestChanges}
              disabled={sendingChanges || changeNote.trim().length < 5}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--color-red)" }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {sendingChanges ? "Sending…" : "Send back to nexxtt.io"}
            </button>
            <button
              onClick={() => { setRequestingChanges(false); setChangeNote(""); setError(null); }}
              className="text-[0.82rem] text-muted hover:text-dark"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
