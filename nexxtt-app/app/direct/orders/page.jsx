import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DirectTopbar } from "@/components/layout/DirectTopbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCents } from "@/lib/money";

export const metadata = { title: "My Orders · nexxtt.io", robots: "noindex, nofollow" };

export default async function DirectOrdersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      `id, job_number, status, is_rush, total_retail_cents, created_at,
       projects ( id, status, retail_price_cents, is_rush, due_date,
                  services ( name, icon ) )`
    )
    .eq("direct_client_user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <DirectTopbar title="My Orders" />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        {(!jobs || jobs.length === 0) ? (
          <EmptyState
            icon="📋"
            title="No orders yet"
            description="Pick the service you need and we'll start work as soon as the brief is in."
            action={
              <Link
                href="/direct/orders/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white"
                style={{ background: "var(--color-teal)", boxShadow: "0 2px 10px rgba(0,184,169,0.25)" }}
              >
                + New Order
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {jobs.map((j) => (
              <Link
                key={j.id}
                href={`/direct/orders/${j.id}`}
                className="block bg-white border border-border rounded-[14px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
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
                  <div className="text-right flex-shrink-0">
                    <div className="text-[0.68rem] font-bold uppercase text-muted" style={{ letterSpacing: "0.08em" }}>
                      TOTAL
                    </div>
                    <div className="font-display text-[1.2rem] font-extrabold text-dark">
                      {formatCents(j.total_retail_cents)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
