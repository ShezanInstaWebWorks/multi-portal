"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCents } from "@/lib/money";
import { OrderDrawer } from "./OrderDrawer";

export function AdminOrdersTable({ rows }) {
  const [active, setActive] = useState(null);

  return (
    <>
      <div className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-off">
                {["Job", "Service", "Via", "Customer", "Status", "Cost", "Retail", "Date", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[0.72rem] font-bold text-muted uppercase"
                    style={{ letterSpacing: "0.08em" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <OrderRow
                  key={r.id}
                  row={r}
                  isLast={i === rows.length - 1}
                  onOpenDrawer={(projectId, jobNumber) =>
                    setActive({ projectId, jobNumber })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDrawer
        open={!!active}
        src={active?.projectId ? `/admin/projects/${active.projectId}?embed=1` : null}
        openHref={active?.projectId ? `/admin/projects/${active.projectId}` : null}
        title={active?.jobNumber ?? null}
        subtitle="Order"
        onClose={() => setActive(null)}
      />
    </>
  );
}

function OrderRow({ row: r, isLast, onOpenDrawer }) {
  const router = useRouter();
  const [pending, setPending] = useState(null); // "confirm" | "reject" | null
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState(null);

  const isPending = r.status === "pending_admin_approval";
  const canOpen = !!r.firstProjectId && !isPending;

  async function confirm() {
    setPending("confirm");
    setError(null);
    const res = await fetch(`/api/admin/jobs/${r.id}/confirm`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    router.refresh();
  }

  async function reject() {
    setPending("reject");
    setError(null);
    const res = await fetch(`/api/admin/jobs/${r.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setShowRejectForm(false);
    router.refresh();
  }

  return (
    <>
      <tr
        onClick={() => {
          if (canOpen) onOpenDrawer(r.firstProjectId, r.job_number);
        }}
        onKeyDown={(e) => {
          if (!canOpen) return;
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDrawer(r.firstProjectId, r.job_number); }
        }}
        tabIndex={canOpen ? 0 : -1}
        role={canOpen ? "button" : undefined}
        aria-label={canOpen ? `Open order ${r.job_number}` : undefined}
        className={`transition-colors ${!isLast ? "border-b border-border" : ""} ${
          isPending
            ? "bg-amber/5 hover:bg-amber/8"
            : canOpen
            ? "cursor-pointer hover:bg-teal-pale"
            : ""
        }`}
      >
        <td className="px-4 py-3 font-mono text-[0.78rem] text-teal">{r.job_number}</td>
        <td className="px-4 py-3">
          {r.services?.length ? (
            <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
              {r.services.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[0.72rem] font-semibold bg-off border border-border text-body whitespace-nowrap"
                >
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="font-semibold text-dark text-[0.85rem]">—</div>
          )}
          <div className="text-[0.72rem] text-muted mt-1">
            {r.projectCount} project{r.projectCount === 1 ? "" : "s"}
            {r.is_rush && " · rush"}
          </div>
        </td>
        <td className="px-4 py-3"><PortalPill kind={r.via} /></td>
        <td className="px-4 py-3">
          <div className="font-semibold text-dark text-[0.85rem]">{r.whoName}</div>
          {r.clientLabel && (
            <div className="text-[0.72rem] text-muted">for {r.clientLabel}</div>
          )}
        </td>
        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
        <td className="px-4 py-3 text-body text-[0.85rem]">{formatCents(r.total_cost_cents)}</td>
        <td className="px-4 py-3 font-bold text-dark text-[0.85rem]">{formatCents(r.total_retail_cents)}</td>
        <td className="px-4 py-3 text-[0.78rem] text-muted">{r.dateLabel}</td>

        {/* Confirm / reject actions */}
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {isPending && !showRejectForm && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={confirm}
                disabled={pending !== null}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[0.75rem] font-bold text-white disabled:opacity-50 transition-opacity"
                style={{ background: "var(--color-green)", boxShadow: "0 1px 6px rgba(16,185,129,0.25)" }}
                title="Confirm order"
              >
                <Check className="w-3 h-3" />
                {pending === "confirm" ? "…" : "Confirm"}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={pending !== null}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[0.75rem] font-bold text-red bg-red/10 border border-red/25 hover:bg-red hover:text-white transition-all disabled:opacity-50"
                title="Reject order"
              >
                <X className="w-3 h-3" />
                Reject
              </button>
            </div>
          )}
          {error && (
            <div className="text-[0.72rem] text-red mt-1">{error}</div>
          )}
        </td>
      </tr>

      {/* Reject reason form — inline row below the order row */}
      {isPending && showRejectForm && (
        <tr className="border-b border-border bg-red/5">
          <td colSpan={9} className="px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[0.8rem] font-bold text-red shrink-0">Reject {r.job_number}:</span>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason (optional — sent to agency)"
                className="flex-1 min-w-[200px] px-3 py-1.5 border border-border rounded-[8px] text-[0.82rem] outline-none focus:border-red"
              />
              <button
                onClick={reject}
                disabled={pending !== null}
                className="px-4 py-1.5 rounded-[8px] text-[0.78rem] font-bold text-white bg-red disabled:opacity-50"
              >
                {pending === "reject" ? "Rejecting…" : "Confirm rejection"}
              </button>
              <button
                onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                className="px-3 py-1.5 rounded-[8px] text-[0.78rem] font-semibold text-muted bg-off border border-border hover:border-dark"
              >
                Cancel
              </button>
              {error && <span className="text-[0.72rem] text-red">{error}</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PortalPill({ kind }) {
  const map = {
    Agency: { bg: "var(--color-teal-bg)",   border: "var(--color-teal-bdr)", color: "var(--color-teal)" },
    Direct: { bg: "rgba(16,185,129,0.08)",   border: "rgba(16,185,129,0.22)", color: "var(--color-green)" },
  };
  const m = map[kind] ?? map.Agency;
  return (
    <span
      className="inline-flex items-center px-2 py-[2px] rounded-full text-[0.65rem] font-bold whitespace-nowrap"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}
    >
      {kind}
    </span>
  );
}
