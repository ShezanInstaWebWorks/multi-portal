import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DirectTopbar } from "@/components/layout/DirectTopbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { DirectOrdersList } from "@/components/direct/DirectOrdersList";

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
                href="/direct/requests"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white"
                style={{ background: "var(--color-teal)", boxShadow: "0 2px 10px rgba(0,184,169,0.25)" }}
              >
                + New Order
              </Link>
            }
          />
        ) : (
          <DirectOrdersList jobs={jobs} />
        )}
      </main>
    </>
  );
}
