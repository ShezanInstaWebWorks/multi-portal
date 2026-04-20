import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { OrdersList } from "@/components/orders/OrdersList";
import { EmptyState } from "@/components/shared/EmptyState";
import { resolveAgencyContext } from "@/lib/impersonation";

export const metadata = {
  title: "Orders · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function OrdersPage() {
  const ctx = await resolveAgencyContext();
  if (!ctx.user) redirect("/login");

  const { data: jobs } = ctx.agencyId
    ? await ctx.supabase
        .from("jobs")
        .select(
          `id, job_number, status, is_rush, total_cost_cents, total_retail_cents, created_at,
           clients ( id, business_name ),
           projects ( id, status, cost_price_cents, retail_price_cents, is_rush, due_date,
                      services ( id, name, icon, slug ) )`
        )
        .eq("agency_id", ctx.agencyId)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title="Orders" />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        {!jobs || jobs.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No orders yet"
            description="Place your first order and it'll show up here — cost, retail, profit and progress all in one view."
            action={
              <Link
                href="/agency/orders/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white"
                style={{
                  background: "var(--color-teal)",
                  boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
                }}
              >
                + New Order
              </Link>
            }
          />
        ) : (
          <OrdersList jobs={jobs} />
        )}
      </main>
    </>
  );
}
