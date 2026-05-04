import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { OrderWizard } from "@/components/order-builder/OrderWizard";

export const metadata = {
  title: "New Order · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function NewOrderPage() {
  const supabase = await createServerSupabaseClient();

  // Resolve the agency for the current session so we can gate client selection.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  // Services catalog (public-read policy) + agency balance + agency's clients.
  const [servicesRes, agencyRes, clientsRes, configRes, packagesRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, slug, icon, cost_price_cents, default_retail_cents, sla_days, rush_sla_days")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    profile?.agency_id
      ? supabase.from("agencies").select("id, name, balance_cents, plan").eq("id", profile.agency_id).single()
      : Promise.resolve({ data: null }),
    profile?.agency_id
      ? supabase
          .from("clients")
          .select("id, business_name, contact_name, contact_email")
          .eq("agency_id", profile.agency_id)
          .order("business_name", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase.from("platform_config").select("rush_surcharge").limit(1).single(),
    supabase
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
          agency={agencyRes.data ?? null}
          rushSurcharge={Number(configRes.data?.rush_surcharge ?? 0.5)}
        />
      </main>
    </>
  );
}
