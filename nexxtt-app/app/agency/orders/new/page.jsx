import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { OrderWizard } from "@/components/order-builder/OrderWizard";
import { resolveAgencyContext } from "@/lib/impersonation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "New Order · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function NewOrderPage() {
  const ctx = await resolveAgencyContext();
  if (!ctx.user) redirect("/login");
  if (!ctx.agencyId) redirect("/agency/dashboard");

  // Use admin client for all reads so RLS never blocks the agency's own data.
  const admin = createAdminSupabaseClient();

  const [servicesRes, clientsRes, configRes, packagesRes] = await Promise.all([
    admin
      .from("services")
      .select("id, name, slug, icon, cost_price_cents, default_retail_cents, sla_days, rush_sla_days")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    admin
      .from("clients")
      .select("id, business_name, contact_name, contact_email")
      .eq("agency_id", ctx.agencyId)
      .order("business_name", { ascending: true }),
    admin
      .from("platform_config")
      .select("rush_surcharge")
      .limit(1)
      .single(),
    admin
      .from("service_packages")
      .select("id, service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title="New Order" />
      </Suspense>
      <main id="main-content" className="flex-1">
        <OrderWizard
          services={servicesRes.data ?? []}
          packages={packagesRes.data ?? []}
          clients={clientsRes.data ?? []}
          agency={ctx.agency ?? null}
          rushSurcharge={Number(configRes.data?.rush_surcharge ?? 0.5)}
        />
      </main>
    </>
  );
}
