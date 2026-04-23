"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { key: "brief_pending",      label: "Brief pending" },
  { key: "in_progress",        label: "In progress" },
  { key: "in_review",          label: "In review" },
  { key: "revision_requested", label: "Revision requested" },
  { key: "delivered",          label: "Delivered" },
  { key: "approved",           label: "Approved" },
  { key: "disputed",           label: "Disputed" },
  { key: "cancelled",          label: "Cancelled" },
];

export function AdminProjectControls({ project }) {
  const router = useRouter();
  const [status, setStatus] = useState(project.status);
  const [start,  setStart]  = useState(project.start_date ?? "");
  const [due,    setDue]    = useState(project.due_date ?? "");
  const [isRush, setIsRush] = useState(!!project.is_rush);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  async function patch(body, { onError } = {}) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setSavedAt(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      router.refresh();
      return true;
    }
    setError(payload.error ?? `Save failed (${res.status})`);
    onError?.(payload);
    return false;
  }

  return (
    <div className="bg-white border border-border rounded-[12px] p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-display text-[1rem] font-extrabold text-dark">Project controls</h2>
        {savedAt && !error && <span className="text-[0.72rem] text-muted">Saved {savedAt}</span>}
      </div>

      {error && (
        <div
          className="rounded-[8px] px-3 py-2 mb-3 text-[0.82rem]"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "var(--color-red)",
          }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Status">
          <select
            className="input"
            value={status}
            disabled={busy}
            onChange={(e) => {
              const next = e.target.value;
              const prev = status;
              setStatus(next);
              // Send dates alongside the status flip — if the form has them but
              // the DB doesn't yet, this same PATCH satisfies the dates check.
              const body = { status: next };
              if (next === "in_progress") {
                if (start) body.startDate = start;
                if (due)   body.dueDate   = due;
              }
              patch(body, { onError: () => setStatus(prev) });
            }}
          >
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>

        <Field label="Rush?">
          <label className="inline-flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={isRush}
              disabled={busy}
              onChange={(e) => { setIsRush(e.target.checked); patch({ isRush: e.target.checked }); }}
            />
            <span className="text-[0.85rem] text-body">Mark as rush</span>
          </label>
        </Field>

        <Field label="Start date">
          <input
            type="date"
            className="input"
            value={start}
            disabled={busy}
            onChange={(e) => setStart(e.target.value)}
            onBlur={() => patch({ startDate: start || null })}
          />
        </Field>

        <Field label="Due date">
          <input
            type="date"
            className="input"
            value={due}
            disabled={busy}
            onChange={(e) => setDue(e.target.value)}
            onBlur={() => patch({ dueDate: due || null })}
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[0.72rem] font-bold text-body mb-1.5 uppercase" style={{ letterSpacing: "0.06em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
