import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { formatCents } from "@/lib/money";

export const metadata = { title: "Referrals · Admin · nexxtt.io", robots: "noindex, nofollow" };

export default async function AdminReferralsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();

  const [partnersRes, referralsRes, entriesRes, profilesRes] = await Promise.all([
    admin
      .from("referral_partners")
      .select("id, user_id, business_name, referral_code, total_earned_cents, pending_payout_cents, joined_at"),
    admin
      .from("referrals")
      .select("id, referral_partner_id, is_active, commission_expires_at"),
    admin
      .from("commission_entries")
      .select("referral_partner_id, commission_cents, status, period_month"),
    admin
      .from("user_profiles")
      .select("id, first_name, last_name"),
  ]);

  const profileName = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()])
  );

  const refsByPartner = new Map();
  for (const r of referralsRes.data ?? []) {
    const cur = refsByPartner.get(r.referral_partner_id) ?? { total: 0, active: 0 };
    cur.total += 1;
    if (r.is_active) cur.active += 1;
    refsByPartner.set(r.referral_partner_id, cur);
  }

  const entriesByPartner = new Map();
  for (const e of entriesRes.data ?? []) {
    const cur = entriesByPartner.get(e.referral_partner_id) ?? { paid: 0, pending: 0, entryCount: 0 };
    cur.entryCount += 1;
    if (e.status === "paid") cur.paid += e.commission_cents;
    else cur.pending += e.commission_cents;
    entriesByPartner.set(e.referral_partner_id, cur);
  }

  const partners = (partnersRes.data ?? []).map((p) => ({
    ...p,
    partnerName: profileName.get(p.user_id) ?? "—",
    refs: refsByPartner.get(p.id) ?? { total: 0, active: 0 },
    entries: entriesByPartner.get(p.id) ?? { paid: 0, pending: 0, entryCount: 0 },
  }));

  const totals = {
    partners:  partners.length,
    active:    partners.filter((p) => p.refs.active > 0).length,
    earned:    partners.reduce((a, p) => a + (p.total_earned_cents ?? 0), 0),
    pending:   partners.reduce((a, p) => a + (p.pending_payout_cents ?? 0), 0),
  };

  return (
    <>
      <AdminTopbar title="Referral Partners" />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        <h1 className="font-display text-[1.2rem] font-extrabold text-dark mb-1">
          Referral program
        </h1>
        <p className="text-sm text-muted mb-5">
          Every referral partner, their streams, and the commissions owed them.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Stat label="Total partners"        value={totals.partners} accent="var(--color-teal)" />
          <Stat label="With active streams"    value={totals.active}    accent="var(--color-green)" />
          <Stat label="Platform commissions paid"
                value={formatCents(totals.earned)}  valueColor="var(--color-green)" accent="var(--color-green)" />
          <Stat label="Pending payouts"        value={formatCents(totals.pending)}
                valueColor="var(--color-amber)" accent="var(--color-amber)" />
        </div>

        <div className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-off">
                  {["Partner", "Code", "Referrals", "Commission entries", "Earned", "Pending", "Joined"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[0.72rem] font-bold text-muted uppercase"
                      style={{ letterSpacing: "0.08em" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-muted">
                      No referral partners yet.
                    </td>
                  </tr>
                ) : (
                  partners.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-teal-pale transition-colors ${
                        i < partners.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-dark">{p.business_name}</div>
                        <div className="text-[0.75rem] text-muted">{p.partnerName}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[0.82rem] text-body">
                        {p.referral_code}
                      </td>
                      <td className="px-4 py-3 text-body">
                        {p.refs.active}
                        <span className="text-muted"> / {p.refs.total}</span>
                        <div className="text-[0.72rem] text-muted">active / total</div>
                      </td>
                      <td className="px-4 py-3 text-body">{p.entries.entryCount}</td>
                      <td className="px-4 py-3 font-semibold text-green">
                        {formatCents(p.total_earned_cents)}
                      </td>
                      <td className="px-4 py-3 text-amber font-semibold">
                        {formatCents(p.pending_payout_cents)}
                      </td>
                      <td className="px-4 py-3 text-[0.78rem] text-muted">
                        {new Date(p.joined_at).toLocaleDateString("en-AU", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, accent, valueColor }) {
  return (
    <div className="relative bg-white border border-border rounded-xl p-4 overflow-hidden shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
      <div
        className="text-[0.68rem] font-bold text-muted uppercase mb-1.5"
        style={{ letterSpacing: "0.08em" }}
      >
        {label}
      </div>
      <div
        className="font-display text-[1.35rem] font-extrabold leading-none"
        style={{ color: valueColor ?? "var(--color-dark)" }}
      >
        {value}
      </div>
    </div>
  );
}
