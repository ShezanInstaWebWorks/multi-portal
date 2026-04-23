"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCents } from "@/lib/money";
import { OrderDrawer } from "./OrderDrawer";

export function AdminOrdersTable({ rows }) {
  const [active, setActive] = useState(null); // { projectId, jobNumber } | null

  return (
    <>
      <div className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-off">
                {["Job", "Service", "Via", "Customer", "Status", "Cost", "Retail", "Date"].map((h) => (
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
              {rows.map((r, i) => {
                const canOpen = !!r.firstProjectId;
                const onOpen = () => {
                  if (!canOpen) return;
                  setActive({ projectId: r.firstProjectId, jobNumber: r.job_number });
                };
                return (
                  <tr
                    key={r.id}
                    onClick={onOpen}
                    onKeyDown={(e) => {
                      if (!canOpen) return;
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
                    }}
                    tabIndex={canOpen ? 0 : -1}
                    role={canOpen ? "button" : undefined}
                    aria-label={canOpen ? `Open order ${r.job_number}` : undefined}
                    className={`transition-colors ${
                      i < rows.length - 1 ? "border-b border-border" : ""
                    } ${canOpen ? "cursor-pointer hover:bg-teal-pale" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-[0.78rem] text-teal">
                      {r.job_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-dark flex items-center gap-1.5">
                        <span>{r.serviceIcon}</span>
                        <span>{r.serviceName ?? "—"}</span>
                      </div>
                      <div className="text-[0.72rem] text-muted">
                        {r.projectCount} project{r.projectCount === 1 ? "" : "s"}
                        {r.is_rush && " · rush"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PortalPill kind={r.via} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-dark text-[0.85rem]">{r.whoName}</div>
                      {r.clientLabel && (
                        <div className="text-[0.72rem] text-muted">for {r.clientLabel}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-body text-[0.85rem]">{formatCents(r.total_cost_cents)}</td>
                    <td className="px-4 py-3 font-bold text-dark text-[0.85rem]">{formatCents(r.total_retail_cents)}</td>
                    <td className="px-4 py-3 text-[0.78rem] text-muted">{r.dateLabel}</td>
                  </tr>
                );
              })}
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

function PortalPill({ kind }) {
  const map = {
    Agency: { bg: "var(--color-teal-bg)",    border: "var(--color-teal-bdr)", color: "var(--color-teal)" },
    Direct: { bg: "rgba(16,185,129,0.08)",    border: "rgba(16,185,129,0.22)", color: "var(--color-green)" },
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
