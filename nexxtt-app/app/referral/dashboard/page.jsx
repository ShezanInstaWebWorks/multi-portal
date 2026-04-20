import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { RefTopbar } from "@/components/layout/RefTopbar";
import { RefDashboard } from "@/components/referral/RefDashboard";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata = {
  title: "Referral Dashboard · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function ReferralDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const { data: partner } = await supabase
    .from("referral_partners")
    .select("id, business_name, referral_code, total_earned_cents, pending_payout_cents, commission_pct, commission_duration_months, joined_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!partner) {
    return (
      <>
        <RefTopbar userName={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <EmptyState
            icon="🤝"
            title="No referral partner profile yet"
            description="Reach out to nexxtt.io to activate your referral partner account."
          />
        </main>
      </>
    );
  }

  // Referrals + commission entries via RLS.
  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, referred_user_id, referred_at, first_order_at, commission_expires_at, is_active")
    .eq("referral_partner_id", partner.id)
    .order("referred_at", { ascending: false });

  const { data: commissions } = await supabase
    .from("commission_entries")
    .select("id, referral_id, job_id, period_month, order_value_cents, commission_cents, status, paid_at")
    .eq("referral_partner_id", partner.id)
    .order("period_month", { ascending: false });

  // Resolve referred user names (needs service role — agency_client / agency
  // user_profiles aren't visible to referral_partner via RLS).
  const admin = createAdminSupabaseClient();
  const referredIds = (referrals ?? []).map((r) => r.referred_user_id).filter(Boolean);
  let referredById = {};
  if (referredIds.length > 0) {
    const [profilesRes, agenciesRes] = await Promise.all([
      admin.from("user_profiles").select("id, first_name, last_name, role, agency_id").in("id", referredIds),
      admin.from("agencies").select("id, name"),
    ]);
    const agencyName = new Map((agenciesRes.data ?? []).map((a) => [a.id, a.name]));
    referredById = Object.fromEntries(
      (profilesRes.data ?? []).map((p) => {
        let business = null;
        if (p.role === "agency" && p.agency_id) business = agencyName.get(p.agency_id) ?? null;
        if (!business && p.role === "direct_client") business = "Direct client";
        return [p.id, { ...p, business_name: business }];
      })
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const referralUrl = `${appUrl.replace(/^https?:\/\//, "")}/ref/${partner.referral_code.toLowerCase()}`;

  return (
    <>
      <RefTopbar userName={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Referral Partner"} />
      <RefDashboard
        partner={partner}
        referrals={referrals ?? []}
        commissions={commissions ?? []}
        referredById={referredById}
        referralUrl={referralUrl}
      />
    </>
  );
}
