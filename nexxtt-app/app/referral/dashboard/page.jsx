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

  // User-level auth already passed. Use admin client for the partner lookup
  // (RLS under SSR has been flaky for this table — matches the pattern we use
  // on the agency side, where authorization is enforced at the page gate).
  const admin = createAdminSupabaseClient();
  const [{ data: profile }, { data: partner }] = await Promise.all([
    admin
      .from("user_profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single(),
    admin
      .from("referral_partners")
      .select("id, business_name, referral_code, total_earned_cents, pending_payout_cents, joined_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

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

  // Referrals + commission entries — both scoped to this partner.id so using
  // admin client is safe and avoids the SSR/RLS flakiness that swallows rows.
  const [{ data: referrals }, { data: commissions }] = await Promise.all([
    admin
      .from("referrals")
      .select("id, referred_user_id, referred_at, first_order_at, commission_expires_at, is_active")
      .eq("referral_partner_id", partner.id)
      .order("referred_at", { ascending: false }),
    admin
      .from("commission_entries")
      .select("id, referral_id, job_id, period_month, order_value_cents, commission_cents, status, paid_at")
      .eq("referral_partner_id", partner.id)
      .order("period_month", { ascending: false }),
  ]);

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3210";
  // Full URL with protocol so the Copy Link button produces a clickable link.
  const referralUrl = `${appUrl.replace(/\/$/, "")}/ref/${partner.referral_code.toLowerCase()}`;

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
