import { Suspense } from "react";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { DashboardD } from "@/components/dashboard/DashboardD";
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

  // Only fetch the orders list when we actually need it for the list view.
  let jobs = [];
  if (view === "list" && ctx.agencyId) {
    const { data } = await ctx.supabase
      .from("jobs")
      .select(
        `id, job_number, status, is_rush, total_cost_cents, total_retail_cents, created_at,
         clients ( id, business_name ),
         projects ( id, status, cost_price_cents, retail_price_cents, is_rush, due_date,
                    services ( id, name, icon, slug ) )`
      )
      .eq("agency_id", ctx.agencyId)
      .order("created_at", { ascending: false });
    jobs = data ?? [];
  }

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title="Dashboard" showSwitcher />
      </Suspense>
      <main id="main-content" className="flex-1">
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
          <DashboardD agency={agency} firstName={firstName} />
        )}
      </main>
    </>
  );
}
