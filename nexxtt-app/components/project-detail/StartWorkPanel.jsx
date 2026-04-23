"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

/**
 * Agency/admin sees this when a project is still "brief_pending".
 * Requires a start date + due date before flipping status → "in_progress".
 * The dates persist on the project so everyone can see the planned timeline.
 */
export function StartWorkPanel({ projectId, defaultStartDate = null, defaultDueDate = null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(defaultStartDate ?? today);
  const [dueDate, setDueDate]     = useState(defaultDueDate ?? "");
  const busy = submitting || isPending;
  const canSubmit = !!startDate && !!dueDate && startDate <= dueDate && !busy;

  async function start() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, dueDate }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not start work");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <section
      className="mb-5 bg-white border border-border rounded-[16px] p-5 shadow-sm"
      style={{ borderLeft: "4px solid var(--color-teal)" }}
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <h2 className="font-display text-[0.95rem] font-extrabold text-dark mb-1">
            Ready to start?
          </h2>
          <p className="text-[0.82rem] text-muted">
            Pick a start date and due date. Once you start, the client sees work has begun and the timeline locks in.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 mt-3 items-end">
        <label className="block">
          <span className="block text-[0.7rem] font-bold uppercase text-muted mb-1.5" style={{ letterSpacing: "0.06em" }}>
            Start date
          </span>
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="block">
          <span className="block text-[0.7rem] font-bold uppercase text-muted mb-1.5" style={{ letterSpacing: "0.06em" }}>
            Due date
          </span>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={startDate || undefined}
            disabled={busy}
          />
        </label>
        <button
          onClick={start}
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white disabled:opacity-40"
          style={{
            background: "var(--color-teal)",
            boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
          }}
        >
          <Play className="w-3.5 h-3.5" />
          {busy ? "Starting…" : "Start work"}
        </button>
      </div>

      {startDate && dueDate && startDate > dueDate && (
        <div className="text-[0.78rem] text-red mt-2">Start date can't be after due date.</div>
      )}
      {error && (
        <div className="text-[0.78rem] text-red mt-2">{error}</div>
      )}
    </section>
  );
}
