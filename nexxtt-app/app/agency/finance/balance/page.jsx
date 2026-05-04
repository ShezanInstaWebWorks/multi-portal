import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AgencyBalancePage } from "./AgencyBalanceClient";

export default async function BalancePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id || !["agency", "admin"].includes(profile.role)) {
    redirect("/agency/dashboard");
  }

  const admin = createAdminSupabaseClient();

  // Get agency with balance
  const { data: agency } = await admin
    .from("agencies")
    .select("id, business_name, balance_cents")
    .eq("id", profile.agency_id)
    .single();

  // Get balance transactions
  const { data: transactions } = await admin
    .from("balance_transactions")
    .select("*")
    .eq("agency_id", profile.agency_id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <AgencyBalancePage
      agency={agency}
      transactions={transactions ?? []}
    />
  );
}
