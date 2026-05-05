import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { DirectTopbar } from "@/components/layout/DirectTopbar";
import { DirectOrderWizard } from "@/components/order-builder/DirectOrderWizard";

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
      <main id="main-content" className="flex-1">
        <DirectOrderWizard
          services={services ?? []}
          packages={packages ?? []}
          user={user}
        />
      </main>
    </>
  );
}
