"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, X } from "lucide-react";

/**
 * Replaces the visual stubs in ProjectDetailView when a client viewer is looking
 * at a project in `in_review`. Real POST → refresh.
 */
export function ClientActionPanel({ projectId }) {
  const router = useRouter();
  const [mode, setMode] = useState("idle"); // idle | revision-form
  const [pending, setPending] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);

  async function approve() {
    setPending("approve");
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/approve`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) {
      setError(data.error ?? `Failed (${res.status})`);
      return;
    }
    router.refresh();
  }

  async function submitRevision() {
    if (note.trim().length < 5) {
      setError("Please describe what to change (at least 5 characters).");
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
    if (!res.ok) {
      setError(data.error ?? `Failed (${res.status})`);
      return;
    }
    router.refresh();
  }

  if (mode === "revision-form") {
    return (
      <div
        className="rounded-[14px] p-4 mb-5"
        style={{
          background: "rgba(245,158,11,0.06)",
          border: "1.5px solid rgba(245,158,11,0.3)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber" />
            <span className="text-[0.88rem] font-bold text-dark">
              What should we change?
            </span>
          </div>
          <button
            onClick={() => { setMode("idle"); setError(null); setNote(""); }}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/40"
            aria-label="Cancel"
          >
            <X className="w-3.5 h-3.5 text-muted" />
          </button>
        </div>
        <p className="text-[0.78rem] text-muted mb-3">
          A short note keeps everyone aligned. Be specific — one round of revisions
          usually clears it up.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input min-h-[88px] resize-y mb-2"
          placeholder="e.g. Love direction 2, but please try it in a warmer navy and give us one more variation with the icon on the right."
        />
        {error && <div className="text-[0.78rem] text-red mb-2">{error}</div>}
        <div className="flex gap-2 justify-end flex-wrap">
          <button
            onClick={() => { setMode("idle"); setError(null); setNote(""); }}
            className="px-3.5 py-2 rounded-[10px] text-[0.82rem] font-semibold bg-white border border-border text-body hover:border-navy"
          >
            Cancel
          </button>
          <button
            onClick={submitRevision}
            disabled={pending !== null || note.trim().length < 5}
            className="px-4 py-2 rounded-[10px] text-[0.82rem] font-extrabold text-white disabled:opacity-50"
            style={{
              background: "var(--color-amber)",
              boxShadow: "0 2px 10px rgba(245,158,11,0.25)",
            }}
          >
            {pending === "revision" ? "Sending…" : "Send revision request"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] p-4 mb-5 flex items-center gap-3 flex-wrap"
      style={{
        background: "rgba(245,158,11,0.08)",
        border: "1.5px solid rgba(245,158,11,0.3)",
      }}
    >
      <div className="text-[1.1rem] shrink-0">⏰</div>
      <div className="flex-1 min-w-[200px]">
        <div className="text-[0.88rem] font-bold text-dark">
          This project is waiting for your review
        </div>
        <div className="text-[0.75rem] text-muted mt-px">
          Sign off to unlock the next stage, or request revisions with a quick note.
        </div>
        {error && <div className="text-[0.78rem] text-red mt-2">{error}</div>}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={approve}
          disabled={pending !== null}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[0.82rem] font-extrabold text-white disabled:opacity-60"
          style={{
            background: "var(--color-green)",
            boxShadow: "0 2px 10px rgba(16,185,129,0.25)",
          }}
        >
          <Check className="w-3.5 h-3.5" />
          {pending === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          onClick={() => setMode("revision-form")}
          disabled={pending !== null}
          className="px-4 py-2 rounded-[10px] text-[0.82rem] font-semibold bg-white border border-border text-body hover:border-navy transition-colors disabled:opacity-60"
        >
          Request revision
        </button>
      </div>
    </div>
  );
}
