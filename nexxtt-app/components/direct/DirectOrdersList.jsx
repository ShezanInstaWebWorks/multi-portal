"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCents } from "@/lib/money";
import { OrderDrawer } from "@/components/admin/OrderDrawer";

export function DirectOrdersList({ jobs }) {
  const [active, setActive] = useState(null); // { projectId, label }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {jobs.map((j) => {
          const firstProject = j.projects?.[0];
          const canOpen = !!firstProject;
          const open = () => {
            if (!canOpen) return;
            setActive({
              projectId: firstProject.id,
              label: `${j.job_number} · ${firstProject.services?.name ?? "Project"}`,
            });
          };
          return (
            <div
              key={j.id}
              onClick={open}
              onKeyDown={(e) => {
                if (!canOpen) return;
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
              }}
              tabIndex={canOpen ? 0 : -1}
              role={canOpen ? "button" : undefined}
              aria-label={canOpen ? `Open order ${j.job_number}` : undefined}
              className={`block bg-white border border-border rounded-[14px] shadow-sm transition-all overflow-hidden ${
                canOpen ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""
              }`}
            >
              <div className="flex items-center gap-4 px-4 lg:px-5 py-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-extrabold text-dark">
                      #{j.job_number}
                    </span>
                    <StatusBadge status={j.status} />
                    {j.is_rush && (
                      <span
                        className="inline-flex items-center px-2 py-[2px] rounded-full text-[0.62rem] font-bold"
                        style={{
                          background: "rgba(245,158,11,0.1)",
                          color: "var(--color-amber)",
                          border: "1px solid rgba(245,158,11,0.3)",
                        }}
                      >
                        RUSH
                      </span>
                    )}
                  </div>
                  <div className="text-[0.78rem] text-muted mt-0.5">
                    {new Date(j.created_at).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
                    {" · "}
                    {(j.projects?.length ?? 0)} project{(j.projects?.length ?? 0) === 1 ? "" : "s"}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {(j.projects ?? []).slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[0.7rem] font-semibold bg-off border border-border text-body whitespace-nowrap"
                      >
                        <span>{p.services?.icon ?? "•"}</span>
                        <span>{p.services?.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[0.68rem] font-bold uppercase text-muted" style={{ letterSpacing: "0.08em" }}>
                    TOTAL
                  </div>
                  <div className="font-display text-[1.2rem] font-extrabold text-dark">
                    {formatCents(j.total_retail_cents)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <OrderDrawer
        open={!!active}
        src={active?.projectId ? `/direct/projects/${active.projectId}?embed=1` : null}
        openHref={active?.projectId ? `/direct/projects/${active.projectId}` : null}
        title={active?.label ?? null}
        subtitle="Order"
        onClose={() => setActive(null)}
      />
    </>
  );
}
