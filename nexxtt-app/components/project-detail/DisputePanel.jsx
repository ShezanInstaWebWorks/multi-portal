"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, X } from "lucide-react";

export function DisputePanel({ projectId, status, viewerIsAdmin }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (status === "delivered") return null;

  async function raise() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? `Failed (${res.status})`);
      return;
    }
    setShowForm(false);
    router.refresh();
  }

  if (status === "disputed") {
    return (
      <div
        className="rounded-[14px] p-4 mb-5 flex items-start gap-3 flex-wrap"
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "1.5px solid rgba(239,68,68,0.3)",
        }}
      >
        <div className="text-[1.1rem] shrink-0">⚑</div>
        <div className="flex-1 min-w-[200px]">
          <div className="text-[0.88rem] font-bold text-dark">
            This project is in dispute
          </div>
          <div className="text-[0.75rem] text-muted mt-px">
            An admin will review both sides and resolve it. You&apos;ll be
            notified when it&apos;s reopened, force-delivered, or refunded.
          </div>
        </div>
        {viewerIsAdmin && <AdminResolveActions projectId={projectId} />}
      </div>
    );
  }

  return (
    <>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.75rem] font-semibold transition-colors"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "var(--color-red)",
          }}
        >
          <Flag className="w-3 h-3" />
          Raise a dispute
        </button>
      ) : (
        <div
          className="rounded-[14px] p-4 mb-5 flex flex-col gap-3"
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1.5px solid rgba(239,68,68,0.3)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-red" />
              <span className="text-[0.88rem] font-bold text-dark">
                Raise a dispute
              </span>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/40"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5 text-muted" />
            </button>
          </div>
          <p className="text-[0.78rem] text-muted">
            An admin will review this within one business day. Tell them briefly
            what&apos;s off — timelines slipping, scope mismatch, quality, etc.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input min-h-[88px] resize-y"
            placeholder="e.g. Stage 5 is 3 days overdue and concepts don't match the brand direction we agreed on."
          />
          {error && (
            <div className="text-[0.78rem] text-red">{error}</div>
          )}
          <div className="flex gap-2 justify-end flex-wrap">
            <button
              onClick={() => setShowForm(false)}
              className="px-3.5 py-2 rounded-[10px] text-[0.82rem] font-semibold bg-white border border-border text-body hover:border-navy"
            >
              Cancel
            </button>
            <button
              onClick={raise}
              disabled={submitting || reason.trim().length < 5}
              className="px-4 py-2 rounded-[10px] text-[0.82rem] font-extrabold text-white disabled:opacity-50"
              style={{
                background: "var(--color-red)",
                boxShadow: "0 2px 10px rgba(239,68,68,0.25)",
              }}
            >
              {submitting ? "Raising…" : "Submit dispute"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function AdminResolveActions({ projectId }) {
  const router = useRouter();
  const [pending, setPending] = useState(null);

  async function resolve(action) {
    const note = action === "force_deliver"
      ? prompt("Optional note for the client about this force-deliver (leave blank to skip):") ?? ""
      : action === "reopen"
      ? prompt("Optional note for the team about the reopen (leave blank to skip):") ?? ""
      : prompt("Refund note (required for the paper trail):") ?? "";
    if (action === "refund" && !note.trim()) return;

    setPending(action);
    const res = await fetch(`/api/admin/projects/${projectId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: note.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) {
      alert(data.error ?? `Failed (${res.status})`);
      return;
    }
    router.refresh();
  }

  const btn =
    "px-3 py-1.5 rounded-md text-[0.72rem] font-extrabold disabled:opacity-60 whitespace-nowrap";

  return (
    <div className="flex gap-1.5 flex-wrap w-full mt-2">
      <button
        onClick={() => resolve("reopen")}
        disabled={pending !== null}
        className={`${btn}`}
        style={{ background: "var(--color-teal)", color: "white" }}
      >
        {pending === "reopen" ? "Working…" : "↻ Reopen"}
      </button>
      <button
        onClick={() => resolve("force_deliver")}
        disabled={pending !== null}
        className={`${btn}`}
        style={{ background: "var(--color-green)", color: "white" }}
      >
        {pending === "force_deliver" ? "Working…" : "✓ Force deliver"}
      </button>
      <button
        onClick={() => resolve("refund")}
        disabled={pending !== null}
        className={`${btn}`}
        style={{
          background: "white",
          color: "var(--color-red)",
          border: "1px solid var(--color-red)",
        }}
      >
        {pending === "refund" ? "Working…" : "$ Log refund"}
      </button>
    </div>
  );
}
