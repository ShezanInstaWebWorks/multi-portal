import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { formatCents } from "@/lib/money";
import { AdminFinanceCharts } from "@/components/admin/AdminFinanceCharts";

export const metadata = { title: "Finance · Admin · nexxtt.io", robots: "noindex, nofollow" };

export default async function AdminFinancePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();

  const [jobsRes, balTxRes, commRes, servicesRes, projectsRes] = await Promise.all([
    admin.from("jobs").select("id, total_cost_cents, total_retail_cents, created_at"),
    admin.from("balance_transactions").select("type, amount_cents, created_at"),
    admin.from("commission_entries").select("commission_cents, status, period_month"),
    admin.from("services").select("id, name, icon"),
    admin.from("projects").select("service_id, retail_price_cents"),
  ]);

  const jobs = jobsRes.data ?? [];

  const totals = {
    gmv:         jobs.reduce((a, j) => a + (j.total_retail_cents ?? 0), 0),
    cost:        jobs.reduce((a, j) => a + (j.total_cost_cents ?? 0), 0),
    commPaid:    (commRes.data ?? []).filter((c) => c.status === "paid").reduce((a, c) => a + c.commission_cents, 0),
    commPending: (commRes.data ?? []).filter((c) => c.status === "pending").reduce((a, c) => a + c.commission_cents, 0),
  };
  const platformTake = totals.cost - totals.commPaid;

  // Monthly buckets (last 6 months).
  const monthly = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthly.push({ key: monthKey(d), label: d.toLocaleDateString("en-AU", { month: "short" }), gmv: 0, cost: 0 });
  }
  for (const j of jobs) {
    const k = monthKey(new Date(j.created_at));
    const m = monthly.find((x) => x.key === k);
    if (m) {
      m.gmv  += j.total_retail_cents ?? 0;
      m.cost += j.total_cost_cents ?? 0;
    }
  }

  // Top-earning services by retail
  const retailByService = new Map();
  for (const p of projectsRes.data ?? []) {
    retailByService.set(p.service_id, (retailByService.get(p.service_id) ?? 0) + (p.retail_price_cents ?? 0));
  }
  const topServices = (servicesRes.data ?? [])
    .map((s) => ({ ...s, retail: retailByService.get(s.id) ?? 0 }))
    .sort((a, b) => b.retail - a.retail);

  return (
    <>
      <AdminTopbar title="Platform Finance" />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        <h1 className="font-display text-[1.2rem] font-extrabold text-dark mb-1">
          Platform finance
        </h1>
        <p className="text-sm text-muted mb-5">
          Platform-wide GMV, cost, commission obligations, and the share left for nexxtt.io.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Stat label="Platform GMV"        value={formatCents(totals.gmv)}    sub="retail billed"
                accent="var(--color-teal)" valueColor="var(--color-teal)" />
          <Stat label="Platform cost base"   value={formatCents(totals.cost)}   sub="wholesale revenue"
                accent="#3b82f6" />
          <Stat label="Commissions paid"     value={formatCents(totals.commPaid)} sub="to referral partners"
                accent="var(--color-green)" valueColor="var(--color-green)" />
          <Stat label="Commissions pending"  value={formatCents(totals.commPending)} sub="due next cycle"
                accent="var(--color-amber)" valueColor="var(--color-amber)" />
        </div>

        <AdminFinanceCharts monthly={monthly} />

        <section className="bg-white rounded-[16px] border border-border shadow-sm p-5 mt-6">
          <h2 className="font-display text-[1rem] font-extrabold text-dark mb-4">
            Top-earning services
          </h2>
          {topServices.length === 0 ? (
            <div className="text-sm text-muted">No projects placed yet.</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topServices.map((s, i) => {
                const top = topServices[0].retail;
                const pct = top > 0 ? Math.round((s.retail / top) * 100) : 0;
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="text-[0.85rem] text-body w-6 text-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[1rem] flex-shrink-0"
                         style={{ background: "var(--color-teal-pale)", color: "var(--color-teal)" }}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-[0.85rem] mb-1">
                        <span className="font-semibold text-dark truncate pr-2">{s.name}</span>
                        <span className="font-bold text-dark">{formatCents(s.retail)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-lg)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(6, pct)}%`,
                            background: "linear-gradient(90deg, var(--color-teal), var(--color-teal-l))",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-[16px] border border-border shadow-sm p-5 mt-5">
          <h2 className="font-display text-[1rem] font-extrabold text-dark mb-2">
            Platform take (GMV − cost − paid commissions)
          </h2>
          <div className="font-display text-[2.2rem] font-extrabold text-teal leading-none">
            {formatCents(platformTake)}
          </div>
          <p className="text-[0.78rem] text-muted mt-2">
            The share left for nexxtt.io after agencies take their margin and
            referral partners take their cut.
          </p>
        </section>
      </main>
    </>
  );
}

function Stat({ label, value, sub, accent, valueColor }) {
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
      {sub && <div className="text-[0.72rem] text-muted mt-1">{sub}</div>}
    </div>
  );
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
