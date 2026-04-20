import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { ProfitDashboard } from "@/components/finance/ProfitDashboard";
import { EmptyState } from "@/components/shared/EmptyState";
import { resolveAgencyContext } from "@/lib/impersonation";

export const metadata = {
  title: "Profit · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function ProfitPage() {
  const ctx = await resolveAgencyContext();
  if (!ctx.user) redirect("/login");

  if (!ctx.agencyId) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted text-sm">Agency account required.</p>
      </main>
    );
  }

  const [jobsRes, clientsRes] = await Promise.all([
    ctx.supabase
      .from("jobs")
      .select(
        "id, job_number, client_id, status, is_rush, total_cost_cents, total_retail_cents, created_at, projects(service_id, services(name))"
      )
      .eq("agency_id", ctx.agencyId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("clients")
      .select("id, business_name")
      .eq("agency_id", ctx.agencyId),
  ]);

  const clients = Object.fromEntries(
    (clientsRes.data ?? []).map((c) => [c.id, c.business_name])
  );

  const jobs = (jobsRes.data ?? []).map((j) => ({
    id: j.id,
    job_number: j.job_number,
    client_id: j.client_id,
    client_name: clients[j.client_id] ?? "—",
    status: j.status,
    is_rush: j.is_rush,
    total_cost_cents: j.total_cost_cents,
    total_retail_cents: j.total_retail_cents,
    profit_cents: (j.total_retail_cents ?? 0) - (j.total_cost_cents ?? 0),
    services: (j.projects ?? []).map((p) => p.services?.name).filter(Boolean),
    created_at: j.created_at,
  }));

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title="Profit Dashboard" />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        {jobs.length === 0 ? (
          <EmptyState
            icon="📈"
            title="No profit data yet"
            description="Once you place your first order, this dashboard will show revenue, profit, and margin by month and by client."
          />
        ) : (
          <ProfitDashboard jobs={jobs} />
        )}
      </main>
    </>
  );
}
