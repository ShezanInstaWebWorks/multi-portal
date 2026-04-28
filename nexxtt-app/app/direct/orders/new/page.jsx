import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { DirectTopbar } from "@/components/layout/DirectTopbar";
import { DirectNewOrderForm } from "@/components/project-requests/DirectNewOrderForm";

export const metadata = { title: "New order · nexxtt.io", robots: "noindex, nofollow" };

export default async function DirectNewOrderPage() {
  const userClient = await createServerSupabaseClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, first_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "direct_client") redirect("/login");

  const [{ data: services }, { data: packages }] = await Promise.all([
    admin
      .from("services")
      .select("id, name, icon, slug, cost_price_cents, default_retail_cents, sla_days, rush_sla_days")
      .eq("is_active", true)
      .order("sort_order"),
    admin
      .from("service_packages")
      .select("id, service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <DirectTopbar title="New order" />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[820px] mx-auto w-full">
        <Link
          href="/direct/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to my orders
        </Link>

        <div
          className="relative overflow-hidden rounded-[18px] p-5 mb-5 text-white"
          style={{ background: "linear-gradient(135deg, var(--color-navy) 0%, #152d52 60%, var(--color-navy) 100%)" }}
        >
          <div className="font-display text-[1.3rem] font-extrabold tracking-tight">
            Tell us what you need
          </div>
          <p className="text-[0.85rem] text-white/60 mt-1 max-w-[560px]">
            Fill this in and nexxtt.io's super admin will pick it up. You can negotiate the
            price and delivery date, then approve before any work starts.
          </p>
        </div>

        <DirectNewOrderForm services={services ?? []} packages={packages ?? []} />

        <div className="mt-5 text-[0.82rem] text-muted">
          Prefer to chat first?{" "}
          <Link href="/direct/requests" className="text-teal font-semibold hover:underline">
            Open the requests inbox
          </Link>{" "}
          to message the team.
        </div>
      </main>
    </>
  );
}
