import Link from "next/link";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCents } from "@/lib/money";

export const metadata = {
  title: "Admin · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Proxy enforces role=admin; layout assumed too.

  // Admin queries bypass RLS via service role (admin role has no agency_id so
  // normal RLS policies would return nothing).
  const admin = createAdminSupabaseClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [agenciesRes, clientsRes, directRes, refPartnersRes,
         ordersMtdRes, liveOrdersRes, pendingCommRes, gmvMtdRes, agenciesForBoardRes]
    = await Promise.all([
      admin.from("agencies").select("id, name, slug, status, balance_cents, plan, approved_at, joined_at").order("joined_at", { ascending: false }),
      admin.from("clients").select("id").limit(1000),
      admin.from("user_profiles").select("id").eq("role", "direct_client"),
      admin.from("referral_partners").select("id, business_name, pending_payout_cents"),
      admin.from("jobs").select("id, total_retail_cents").gte("created_at", monthStart),
      admin.from("jobs").select(
        "id, job_number, status, total_retail_cents, created_at, agency_id, direct_client_user_id, client_id, projects(service_id, services(name, icon))"
      ).order("created_at", { ascending: false }).limit(5),
      admin.from("commission_entries").select("commission_cents").eq("status", "pending"),
      admin.from("jobs").select("total_retail_cents").gte("created_at", monthStart),
      admin.from("jobs").select("agency_id, total_retail_cents").not("agency_id", "is", null).gte("created_at", monthStart),
    ]);

  // KPIs
  const activeAgencies   = (agenciesRes.data ?? []).filter((a) => a.status === "active").length;
  const totalClients     = (clientsRes.data?.length ?? 0) + (directRes.data?.length ?? 0);
  const ordersMtd        = ordersMtdRes.data?.length ?? 0;
  const gmvMtd           = (gmvMtdRes.data ?? []).reduce((a, j) => a + (j.total_retail_cents ?? 0), 0);
  const commissionsDue   = (pendingCommRes.data ?? []).reduce((a, c) => a + c.commission_cents, 0);
  const referralPartners = refPartnersRes.data?.length ?? 0;

  // Agency leaderboard (this month, by billed retail)
  const byAgency = new Map();
  for (const j of agenciesForBoardRes.data ?? []) {
    byAgency.set(j.agency_id, (byAgency.get(j.agency_id) ?? 0) + (j.total_retail_cents ?? 0));
  }
  const leaderboard = (agenciesRes.data ?? [])
    .map((a) => ({ ...a, mtd: byAgency.get(a.id) ?? 0 }))
    .sort((x, y) => y.mtd - x.mtd)
    .slice(0, 4);

  // Fetch client names + direct_client names for the live orders feed
  const liveOrders = liveOrdersRes.data ?? [];
  const clientIds = liveOrders.map((o) => o.client_id).filter(Boolean);
  const directIds = liveOrders.map((o) => o.direct_client_user_id).filter(Boolean);
  const [clientsLookup, directLookup] = await Promise.all([
    clientIds.length
      ? admin.from("clients").select("id, business_name").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    directIds.length
      ? admin.from("user_profiles").select("id, first_name, last_name").in("id", directIds)
      : Promise.resolve({ data: [] }),
  ]);
  const clientName = new Map((clientsLookup.data ?? []).map((c) => [c.id, c.business_name]));
  const directName = new Map((directLookup.data ?? []).map((d) => [d.id, `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim()]));

  // Pending agencies need approval
  const pendingAgencies = (agenciesRes.data ?? []).filter((a) => a.status === "pending").length;

  return (
    <>
      <AdminTopbar title="Admin Dashboard" />
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        {/* Action-needed notice */}
        {(pendingAgencies > 0 || commissionsDue > 0) && (
          <div
            className="rounded-[14px] p-4 mb-5 flex items-center gap-3 flex-wrap"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.25)",
            }}
          >
            <span className="text-[1.1rem] flex-shrink-0">⚠️</span>
            <div className="flex-1 min-w-0 text-[0.85rem] text-dark">
              <strong>Attention:</strong>{" "}
              {pendingAgencies > 0 && <>{pendingAgencies} agency pending approval · </>}
              {commissionsDue > 0 && <>{formatCents(commissionsDue)} in referral commissions pending payout</>}
            </div>
            <Link
              href="/admin/agencies"
              className="px-3.5 py-1.5 rounded-[10px] text-[0.78rem] font-semibold"
              style={{
                background: "rgba(124,58,237,0.12)",
                color: "#a78bfa",
                border: "1px solid rgba(124,58,237,0.3)",
              }}
            >
              Review →
            </Link>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Kpi label="Active Agencies"         value={activeAgencies}              sub={pendingAgencies > 0 ? `${pendingAgencies} pending` : "All approved"}
               accent="#7c3aed" />
          <Kpi label="Total Clients"           value={totalClients}                sub="across all portals" accent="#3b82f6" />
          <Kpi label="Orders MTD"              value={ordersMtd}                    sub="this month"         accent="var(--color-teal)" />
          <Kpi label="Platform GMV (MTD)"       value={formatCents(gmvMtd)}         valueColor="var(--color-teal)" sub="retail billed" accent="var(--color-teal)" />
          <Kpi label="Commissions Due"         value={formatCents(commissionsDue)} valueColor="var(--color-amber)" sub="pending payout" accent="var(--color-amber)" />
          <Kpi label="Referral Partners"       value={referralPartners}            sub="active"             accent="var(--color-green)" />
        </div>

        {/* Live orders + leaderboard + quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 items-start mb-6">
          <section className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden">
            <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[1rem] font-extrabold text-dark">Live Order Feed</h2>
                <p className="text-[0.78rem] text-muted">All orders across every portal</p>
              </div>
              <Link href="/admin/orders" className="text-[0.82rem] font-semibold text-teal hover:underline">
                View all →
              </Link>
            </header>
            {liveOrders.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted">No orders yet across the platform.</div>
            ) : (
              <div className="flex flex-col">
                {liveOrders.map((o, i) => {
                  const who = o.agency_id ? "Agency" : o.direct_client_user_id ? "Direct" : "—";
                  const whoName = o.client_id
                    ? clientName.get(o.client_id)
                    : o.direct_client_user_id
                    ? directName.get(o.direct_client_user_id)
                    : "—";
                  const firstService = (o.projects ?? [])[0]?.services;
                  return (
                    <div
                      key={o.id}
                      className={`flex items-center gap-3 px-5 py-3 ${
                        i < liveOrders.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <div className="text-[0.75rem] text-muted w-[96px] truncate font-mono">
                        {o.job_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.88rem] font-semibold text-dark truncate">
                          {firstService?.icon} {firstService?.name ?? "—"}
                        </div>
                      </div>
                      <PortalPill kind={who} />
                      <div className="w-[130px] text-[0.82rem] text-body truncate hidden sm:block">
                        {whoName ?? "—"}
                      </div>
                      <div className="w-[120px] hidden md:block">
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="w-[72px] text-right font-semibold text-dark text-[0.85rem]">
                        {formatCents(o.total_retail_cents)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            {/* Top agencies */}
            <div className="bg-white rounded-[16px] border border-border shadow-sm p-5">
              <div
                className="text-[0.68rem] font-bold uppercase text-muted mb-3"
                style={{ letterSpacing: "0.08em" }}
              >
                TOP AGENCIES (MTD)
              </div>
              {leaderboard.length === 0 ? (
                <div className="text-xs text-muted">No activity this month yet.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {leaderboard.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[0.65rem] font-extrabold"
                        style={{
                          background: i < 3 ? "rgba(124,58,237,0.1)" : "var(--color-off)",
                          color: i < 3 ? "#a78bfa" : "var(--color-muted)",
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 text-[0.82rem] font-semibold text-dark truncate">
                        {a.name}
                      </div>
                      <div className="text-[0.82rem] font-bold text-teal">
                        {formatCents(a.mtd)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/admin/agencies"
                className="block mt-3 text-center px-3 py-1.5 rounded-[10px] text-[0.78rem] font-semibold bg-off border border-border text-body hover:border-navy transition-colors"
              >
                View all agencies →
              </Link>
            </div>

            {/* Quick actions */}
            <div
              className="rounded-[16px] p-5 shadow-sm text-white"
              style={{ background: "var(--color-navy)" }}
            >
              <div
                className="text-[0.68rem] font-bold uppercase text-white/45 mb-3"
                style={{ letterSpacing: "0.08em" }}
              >
                QUICK ACTIONS
              </div>
              <div className="flex flex-col gap-2">
                <QuickAction
                  href="/admin/agencies"
                  icon="🏢"
                  label={`Approve pending ${pendingAgencies === 1 ? "agency" : "agencies"}`}
                  color="#a78bfa"
                  bg="rgba(124,58,237,0.18)"
                  border="rgba(124,58,237,0.3)"
                />
                <QuickAction
                  href="/admin/finance"
                  icon="💸"
                  label="Process referral payouts"
                  color="var(--color-amber)"
                  bg="rgba(245,158,11,0.15)"
                  border="rgba(245,158,11,0.25)"
                />
                <QuickAction
                  href="/admin/orders?status=disputed"
                  icon="⚑"
                  label="Resolve disputed orders"
                  color="var(--color-red)"
                  bg="rgba(239,68,68,0.12)"
                  border="rgba(239,68,68,0.2)"
                />
              </div>
            </div>
          </aside>
        </div>

        {/* Portal health grid */}
        <section className="bg-white rounded-[16px] border border-border shadow-sm p-5">
          <h2 className="font-display text-[1rem] font-extrabold text-dark mb-1">
            Portal Health
          </h2>
          <p className="text-[0.78rem] text-muted mb-4">Live status of all portal types</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <PortalTile
              href="/admin/agencies"
              icon="🏢" label="AGENCY PORTAL" count={activeAgencies} sub="agencies active"
              bg="var(--color-teal-bg)" border="var(--color-teal-bdr)" color="var(--color-teal)"
            />
            <PortalTile
              href="/admin/clients"
              icon="👤" label="CLIENT PORTAL"  count={clientsRes.data?.length ?? 0} sub="agency clients active"
              bg="rgba(91,108,248,0.07)" border="rgba(91,108,248,0.18)" color="#5b6cf8"
            />
            <PortalTile
              href="/admin/referrals"
              icon="🤝" label="REFERRAL PORTAL" count={referralPartners} sub="referral partners"
              bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.2)" color="var(--color-amber)"
            />
            <PortalTile
              href="/admin/clients"
              icon="🏗️" label="DIRECT PORTAL"  count={directRes.data?.length ?? 0} sub="direct clients"
              bg="rgba(16,185,129,0.08)" border="rgba(16,185,129,0.2)" color="var(--color-green)"
            />
          </div>
        </section>
      </main>
    </>
  );
}

function Kpi({ label, value, sub, valueColor, accent }) {
  return (
    <div className="relative bg-white border border-border rounded-xl p-4 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
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
      {sub && <div className="text-[0.72rem] text-muted mt-1">{sub}</div>}
    </div>
  );
}

function PortalPill({ kind }) {
  const map = {
    Agency:  { bg: "var(--color-teal-bg)",       border: "var(--color-teal-bdr)",   color: "var(--color-teal)" },
    Direct:  { bg: "rgba(16,185,129,0.08)",       border: "rgba(16,185,129,0.22)",   color: "var(--color-green)" },
    Client:  { bg: "rgba(91,108,248,0.08)",        border: "rgba(91,108,248,0.22)",    color: "#5b6cf8" },
  };
  const m = map[kind] ?? map.Agency;
  return (
    <span
      className="inline-flex items-center px-2 py-[2px] rounded-full text-[0.65rem] font-bold whitespace-nowrap"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}
    >
      {kind}
    </span>
  );
}

function QuickAction({ href, icon, label, color, bg, border }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-[0.82rem] font-semibold flex items-center gap-2 transition-transform hover:-translate-y-px"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function PortalTile({ href, icon, label, count, sub, bg, border, color }) {
  return (
    <Link
      href={href}
      className="rounded-[12px] p-4 text-center transition-transform hover:-translate-y-0.5"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div className="text-[1.3rem] mb-1">{icon}</div>
      <div
        className="text-[0.68rem] font-bold uppercase mb-0.5"
        style={{ color, letterSpacing: "0.08em" }}
      >
        {label}
      </div>
      <div className="font-display text-[1.3rem] font-extrabold text-navy leading-none">
        {count}
      </div>
      <div className="text-[0.72rem] text-muted mt-0.5">{sub}</div>
    </Link>
  );
}
