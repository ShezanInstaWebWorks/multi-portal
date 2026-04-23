"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AgencyApprovalActions({ agencyId, status }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(null);
  const busy = !!submitting || isPending;

  async function fire(action) {
    setSubmitting(action);
    const res = await fetch(`/api/admin/agencies/${agencyId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(null);
    if (!res.ok) {
      alert(data.error ?? "Action failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (status === "pending") {
    return (
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => fire("approve")}
          disabled={busy}
          className="px-2.5 py-1 rounded-md text-[0.72rem] font-bold text-white disabled:opacity-60"
          style={{ background: "var(--color-green)" }}
        >
          {submitting === "approve" ? "…" : "Approve"}
        </button>
        <button
          onClick={() => fire("suspend")}
          disabled={busy}
          className="px-2.5 py-1 rounded-md text-[0.72rem] font-semibold text-muted bg-off hover:bg-lg disabled:opacity-60"
        >
          {submitting === "suspend" ? "…" : "Reject"}
        </button>
      </div>
    );
  }
  if (status === "active") {
    return (
      <button
        onClick={() => fire("suspend")}
        disabled={busy}
        className="px-2.5 py-1 rounded-md text-[0.72rem] font-semibold text-red bg-off hover:bg-lg disabled:opacity-60"
      >
        {submitting === "suspend" ? "…" : "Suspend"}
      </button>
    );
  }
  if (status === "suspended") {
    return (
      <button
        onClick={() => fire("reactivate")}
        disabled={busy}
        className="px-2.5 py-1 rounded-md text-[0.72rem] font-bold text-white disabled:opacity-60"
        style={{ background: "var(--color-teal)" }}
      >
        {submitting === "reactivate" ? "…" : "Reactivate"}
      </button>
    );
  }
  return null;
}
