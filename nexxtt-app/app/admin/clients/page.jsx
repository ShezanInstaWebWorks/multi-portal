import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { StatusBadge } from "@/components/shared/StatusBadge";

export const metadata = { title: "Clients · Admin · nexxtt.io", robots: "noindex, nofollow" };

export default async function AdminClientsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();

  const [agencyClientsRes, directClientsRes, agenciesRes, jobsRes] = await Promise.all([
    admin
      .from("clients")
      .select("id, business_name, contact_name, contact_email, industry, portal_status, agency_id, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("user_profiles")
      .select("id, first_name, last_name, created_at")
      .eq("role", "direct_client"),
    admin.from("agencies").select("id, name"),
    admin.from("jobs").select("client_id, direct_client_user_id, total_retail_cents, created_at"),
  ]);

  const agencyName = new Map((agenciesRes.data ?? []).map((a) => [a.id, a.name]));

  const jobsByClient = new Map();
  const jobsByDirect = new Map();
  for (const j of jobsRes.data ?? []) {
    if (j.client_id) {
      const cur = jobsByClient.get(j.client_id) ?? { count: 0, retail: 0, lastAt: null };
      cur.count += 1;
      cur.retail += j.total_retail_cents ?? 0;
      if (!cur.lastAt || new Date(j.created_at) > new Date(cur.lastAt)) cur.lastAt = j.created_at;
      jobsByClient.set(j.client_id, cur);
    }
    if (j.direct_client_user_id) {
      const cur = jobsByDirect.get(j.direct_client_user_id) ?? { count: 0, retail: 0, lastAt: null };
      cur.count += 1;
      cur.retail += j.total_retail_cents ?? 0;
      if (!cur.lastAt || new Date(j.created_at) > new Date(cur.lastAt)) cur.lastAt = j.created_at;
      jobsByDirect.set(j.direct_client_user_id, cur);
    }
  }

  // Unified row shape
  const rows = [
    ...(agencyClientsRes.data ?? []).map((c) => ({
      kind: "agency_client",
      id: c.id,
      business: c.business_name,
      contact: c.contact_name,
      email: c.contact_email,
      parent: agencyName.get(c.agency_id) ?? "—",
      portal_status: c.portal_status,
      industry: c.industry,
      created_at: c.created_at,
      stats: jobsByClient.get(c.id) ?? { count: 0, retail: 0, lastAt: null },
    })),
    ...(directClientsRes.data ?? []).map((d) => ({
      kind: "direct",
      id: d.id,
      business: `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim(),
      contact: `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim(),
      email: "—",
      parent: "Direct (nexxtt.io)",
      portal_status: "active",
      industry: null,
      created_at: d.created_at,
      stats: jobsByDirect.get(d.id) ?? { count: 0, retail: 0, lastAt: null },
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totals = {
    agency_clients: agencyClientsRes.data?.length ?? 0,
    direct_clients: directClientsRes.data?.length ?? 0,
    portal_active:  (agencyClientsRes.data ?? []).filter((c) => c.portal_status === "active").length,
    invited:        (agencyClientsRes.data ?? []).filter((c) => c.portal_status === "invited").length,
  };

  return (
    <>
      <AdminTopbar title="Clients" />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        <h1 className="font-display text-[1.2rem] font-extrabold text-dark mb-1">
          Platform clients
        </h1>
        <p className="text-sm text-muted mb-5">
          Every client across every agency, plus direct clients ordering through nexxtt.io.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Stat label="Agency clients" value={totals.agency_clients} accent="var(--color-teal)" />
          <Stat label="Direct clients" value={totals.direct_clients} accent="var(--color-green)" />
          <Stat label="Portal active"  value={totals.portal_active}  accent="#3b82f6" />
          <Stat label="Pending invite" value={totals.invited}         accent="var(--color-amber)" />
        </div>

        <div className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-off">
                  {["Client", "Via", "Portal", "Orders", "Retail", "Last order"].map((h) => (
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
                {rows.map((r, i) => (
                  <tr
                    key={r.kind + r.id}
                    className={`hover:bg-teal-pale transition-colors ${
                      i < rows.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-dark">{r.business}</div>
                      <div className="text-[0.75rem] text-muted">
                        {r.contact !== r.business && `${r.contact} · `}
                        {r.email}
                        {r.industry && ` · ${r.industry}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[0.82rem] text-body">{r.parent}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.portal_status} />
                    </td>
                    <td className="px-4 py-3 text-body">{r.stats.count}</td>
                    <td className="px-4 py-3 text-body">
                      ${((r.stats.retail ?? 0) / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-[0.78rem] text-muted">
                      {r.stats.lastAt
                        ? new Date(r.stats.lastAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="relative bg-white border border-border rounded-xl p-4 overflow-hidden shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
      <div
        className="text-[0.68rem] font-bold text-muted uppercase mb-1.5"
        style={{ letterSpacing: "0.08em" }}
      >
        {label}
      </div>
      <div className="font-display text-[1.35rem] font-extrabold text-dark leading-none">
        {value}
      </div>
    </div>
  );
}
