import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { formatCents } from "@/lib/money";

export const metadata = { title: "Services · Admin · nexxtt.io", robots: "noindex, nofollow" };

export default async function AdminServicesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();

  const [servicesRes, projectsRes] = await Promise.all([
    admin
      .from("services")
      .select("id, name, slug, icon, cost_price_cents, default_retail_cents, sla_days, rush_sla_days, is_active, sort_order")
      .order("sort_order"),
    admin.from("projects").select("service_id, retail_price_cents"),
  ]);

  const useCount = new Map();
  const useRetail = new Map();
  for (const p of projectsRes.data ?? []) {
    useCount.set(p.service_id, (useCount.get(p.service_id) ?? 0) + 1);
    useRetail.set(p.service_id, (useRetail.get(p.service_id) ?? 0) + (p.retail_price_cents ?? 0));
  }

  return (
    <>
      <AdminTopbar title="Service Catalog" />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        <h1 className="font-display text-[1.2rem] font-extrabold text-dark mb-1">
          Service catalog
        </h1>
        <p className="text-sm text-muted mb-5">
          Wholesale cost + default retail price per service. Editing is read-only
          for this pass — a per-service edit pane comes with the pricing tier
          work in a later session.
        </p>

        <div className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-off">
                  {["Service", "Cost", "Default retail", "Default margin", "SLA (std / rush)", "Projects placed", "Retail billed"].map((h) => (
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
                {(servicesRes.data ?? []).map((s, i) => {
                  const profit = (s.default_retail_cents ?? 0) - (s.cost_price_cents ?? 0);
                  const marginPct =
                    s.default_retail_cents > 0
                      ? Math.round((profit / s.default_retail_cents) * 100)
                      : 0;
                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-teal-pale transition-colors ${
                        i < (servicesRes.data?.length ?? 0) - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[1rem]"
                            style={{
                              background: "var(--color-teal-pale)",
                              color: "var(--color-teal)",
                            }}
                          >
                            {s.icon}
                          </div>
                          <div>
                            <div className="font-semibold text-dark">{s.name}</div>
                            <div className="text-[0.72rem] text-muted">
                              /{s.slug}
                              {s.is_active ? (
                                <span className="ml-1.5 text-green">● active</span>
                              ) : (
                                <span className="ml-1.5 text-muted">● inactive</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body">{formatCents(s.cost_price_cents)}</td>
                      <td className="px-4 py-3 font-semibold text-dark">
                        {formatCents(s.default_retail_cents)}
                      </td>
                      <td className="px-4 py-3 font-bold text-green">
                        {formatCents(profit)} <span className="text-muted font-normal">({marginPct}%)</span>
                      </td>
                      <td className="px-4 py-3 text-body text-[0.85rem]">
                        {s.sla_days}d / {s.rush_sla_days}d
                      </td>
                      <td className="px-4 py-3 text-body">
                        {useCount.get(s.id) ?? 0}
                      </td>
                      <td className="px-4 py-3 text-body">
                        {formatCents(useRetail.get(s.id) ?? 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
