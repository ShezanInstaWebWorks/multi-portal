import { redirect } from "next/navigation";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { formatCents } from "@/lib/money";
import { ImpersonateButton } from "@/components/admin/ImpersonateButton";

export const metadata = { title: "Agencies · Admin · nexxtt.io", robots: "noindex, nofollow" };

const PLAN_STYLES = {
  starter:  { bg: "var(--color-lg)",            color: "var(--color-muted)" },
  pro:      { bg: "var(--color-teal-pale)",     color: "var(--color-teal)"  },
  elite:    { bg: "rgba(124,58,237,0.1)",       color: "#7c3aed" },
};
const STATUS_STYLES = {
  active:    { color: "var(--color-green)", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  pending:   { color: "var(--color-amber)", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  suspended: { color: "var(--color-red)",    bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
  archived:  { color: "var(--color-muted)",  bg: "var(--color-lg)",        border: "var(--color-border)"  },
};

export default async function AdminAgenciesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();

  const { data: agencies } = await admin
    .from("agencies")
    .select("id, name, slug, status, plan, contact_name, contact_email, balance_cents, joined_at, approved_at")
    .order("joined_at", { ascending: false });

  // Job counts per agency
  const { data: jobs } = await admin
    .from("jobs")
    .select("agency_id, total_retail_cents, status")
    .not("agency_id", "is", null);
  const stats = new Map();
  for (const j of jobs ?? []) {
    const cur = stats.get(j.agency_id) ?? { jobs: 0, retail: 0 };
    cur.jobs += 1;
    cur.retail += j.total_retail_cents ?? 0;
    stats.set(j.agency_id, cur);
  }

  return (
    <>
      <AdminTopbar title="Agencies" />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        <h1 className="font-display text-[1.2rem] font-extrabold text-dark mb-1">
          Agency management
        </h1>
        <p className="text-sm text-muted mb-5">
          All agencies across the platform — approve, suspend, or inspect as needed.
        </p>

        <div className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-off">
                  {["Agency", "Contact", "Plan", "Status", "Balance", "Jobs", "Retail billed", "Joined", ""].map((h) => (
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
                {(agencies ?? []).map((a, i) => {
                  const st = STATUS_STYLES[a.status] ?? STATUS_STYLES.archived;
                  const pl = PLAN_STYLES[a.plan] ?? PLAN_STYLES.starter;
                  const s = stats.get(a.id) ?? { jobs: 0, retail: 0 };
                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-teal-pale transition-colors ${
                        i < (agencies?.length ?? 0) - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-dark">{a.name}</div>
                        <div className="text-[0.75rem] text-muted">/{a.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-body text-[0.85rem]">
                        <div>{a.contact_name}</div>
                        <div className="text-[0.75rem] text-muted">{a.contact_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-[2px] rounded-full text-[0.68rem] font-bold uppercase"
                          style={{ background: pl.bg, color: pl.color, letterSpacing: "0.06em" }}
                        >
                          {a.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-[2px] rounded-full text-[0.68rem] font-bold"
                          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-body font-semibold">
                        {formatCents(a.balance_cents)}
                      </td>
                      <td className="px-4 py-3 text-body">{s.jobs}</td>
                      <td className="px-4 py-3 text-body">{formatCents(s.retail)}</td>
                      <td className="px-4 py-3 text-body text-[0.82rem]">
                        {new Date(a.joined_at).toLocaleDateString("en-AU", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <ImpersonateButton agencyId={a.id} agencyName={a.name} compact />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden flex flex-col">
            {(agencies ?? []).map((a, i) => {
              const st = STATUS_STYLES[a.status] ?? STATUS_STYLES.archived;
              const s = stats.get(a.id) ?? { jobs: 0, retail: 0 };
              return (
                <div
                  key={a.id}
                  className={`px-4 py-4 ${i < (agencies?.length ?? 0) - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-dark">{a.name}</div>
                      <div className="text-[0.75rem] text-muted">
                        {a.contact_name} · {a.contact_email}
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center px-2 py-[2px] rounded-full text-[0.65rem] font-bold flex-shrink-0"
                      style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                    >
                      {a.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-2 text-[0.75rem] text-muted">
                    <span>{s.jobs} jobs</span>
                    <span>{formatCents(s.retail)} retail</span>
                    <span>Bal {formatCents(a.balance_cents)}</span>
                  </div>
                  <div className="mt-3">
                    <ImpersonateButton agencyId={a.id} agencyName={a.name} compact />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
