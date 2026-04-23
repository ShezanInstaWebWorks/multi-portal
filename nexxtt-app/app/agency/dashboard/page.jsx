import { Suspense } from "react";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { DashboardD } from "@/components/dashboard/DashboardD";
import { DashboardRealtime } from "@/components/dashboard/DashboardRealtime";
import { DashboardViewSwitcher } from "@/components/dashboard/DashboardViewSwitcher";
import { OrdersList } from "@/components/orders/OrdersList";
import { EmptyState } from "@/components/shared/EmptyState";
import { resolveAgencyContext } from "@/lib/impersonation";

export const metadata = {
  title: "Dashboard · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function DashboardPage({ searchParams }) {
  const resolved = (await searchParams) ?? {};
  const view = resolved.view === "list" ? "list" : "d";

  const ctx = await resolveAgencyContext();
  const agency = ctx.agency;
  const firstName = ctx.profile?.first_name ?? null;

  // Always fetch agency jobs (for both views). This is the tenant-scoped data
  // the Overview (DashboardD) computes its stats and timeline from, and the
  // List view renders directly.
  let jobs = [];
  let clientsCount = 0;
  if (ctx.agencyId) {
    const [jobsRes, clientsRes] = await Promise.all([
      ctx.supabase
        .from("jobs")
        .select(
          `id, job_number, status, is_rush, total_cost_cents, total_retail_cents, created_at,
           clients ( id, business_name ),
           projects ( id, status, cost_price_cents, retail_price_cents, is_rush, due_date,
                      services ( id, name, icon, slug ) )`
        )
        .eq("agency_id", ctx.agencyId)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", ctx.agencyId),
    ]);
    jobs = jobsRes.data ?? [];
    clientsCount = clientsRes.count ?? 0;
  }

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title="Dashboard" />
      </Suspense>
      <main id="main-content" className="flex-1">
        <DashboardRealtime agencyId={ctx.agencyId} />
        <div className="px-4 sm:px-6 lg:px-8 pt-5 lg:pt-6">
          <DashboardViewSwitcher current={view} />
        </div>
        {view === "list" ? (
          <div className="px-4 sm:px-6 lg:px-8 pb-20 lg:pb-8">
            {jobs.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No orders yet"
                description="Place your first order and it'll show up here — cost, retail, profit and progress all in one view."
              />
            ) : (
              <OrdersList jobs={jobs} />
            )}
          </div>
        ) : (
          <DashboardD agency={agency} firstName={firstName} jobs={jobs} clientsCount={clientsCount} />
        )}
      </main>
    </>
  );
}
