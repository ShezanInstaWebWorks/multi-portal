import { redirect } from "next/navigation";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";
import { formatCents } from "@/lib/money";

export const metadata = { title: "All Orders · Admin · nexxtt.io", robots: "noindex, nofollow" };

export default async function AdminOrdersPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const statusFilter = typeof sp.status === "string" ? sp.status : null;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();
  let q = admin
    .from("jobs")
    .select(
      `id, job_number, status, is_rush, total_cost_cents, total_retail_cents, agency_id, direct_client_user_id, client_id, created_at,
       projects(id, service_id, services(name, icon))`
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data: jobs } = await q;

  // Resolve agency + client + direct names
  const agencyIds = [...new Set((jobs ?? []).map((j) => j.agency_id).filter(Boolean))];
  const clientIds = [...new Set((jobs ?? []).map((j) => j.client_id).filter(Boolean))];
  const directIds = [...new Set((jobs ?? []).map((j) => j.direct_client_user_id).filter(Boolean))];

  const [agRes, clRes, drRes] = await Promise.all([
    agencyIds.length ? admin.from("agencies").select("id, name").in("id", agencyIds) : Promise.resolve({ data: [] }),
    clientIds.length ? admin.from("clients").select("id, business_name").in("id", clientIds) : Promise.resolve({ data: [] }),
    directIds.length ? admin.from("user_profiles").select("id, first_name, last_name").in("id", directIds) : Promise.resolve({ data: [] }),
  ]);
  const agencyName = new Map((agRes.data ?? []).map((a) => [a.id, a.name]));
  const clientName = new Map((clRes.data ?? []).map((c) => [c.id, c.business_name]));
  const directName = new Map((drRes.data ?? []).map((d) => [d.id, `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim()]));

  const total = jobs?.length ?? 0;
  const gmv   = (jobs ?? []).reduce((a, j) => a + (j.total_retail_cents ?? 0), 0);
  const cost  = (jobs ?? []).reduce((a, j) => a + (j.total_cost_cents ?? 0), 0);
  const margin = cost > 0 ? Math.round((gmv - cost) / gmv * 100) : 0;

  return (
    <>
      <AdminTopbar title="All Orders" />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        <h1 className="font-display text-[1.2rem] font-extrabold text-dark mb-1">
          Platform orders
        </h1>
        <p className="text-sm text-muted mb-5">
          Every job across agency + direct portals.
          {statusFilter && <> Filtered by status <strong className="text-dark">{statusFilter}</strong>.</>}
        </p>

        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Stat label="Total Orders"     value={total} />
          <Stat label="Platform GMV"     value={formatCents(gmv)}  accent="var(--color-teal)" />
          <Stat label="Platform Cost"    value={formatCents(cost)} accent="#3b82f6" />
          <Stat label="Avg Platform Margin" value={`${margin}%`}     accent="var(--color-green)" />
        </div>

        {(jobs?.length ?? 0) === 0 ? (
          <div className="text-center py-10 text-sm text-muted">No orders match the current filter.</div>
        ) : (
          <AdminOrdersTable rows={(jobs ?? []).map((j) => {
            const via = j.agency_id ? "Agency" : j.direct_client_user_id ? "Direct" : "—";
            const whoName = j.agency_id
              ? agencyName.get(j.agency_id) ?? "—"
              : j.direct_client_user_id
              ? directName.get(j.direct_client_user_id) ?? "—"
              : "—";
            const clientLabel = j.client_id ? clientName.get(j.client_id) : null;
            const firstProject = (j.projects ?? [])[0];
            const firstService = firstProject?.services;
            return {
              id: j.id,
              job_number: j.job_number,
              status: j.status,
              is_rush: j.is_rush,
              total_cost_cents: j.total_cost_cents,
              total_retail_cents: j.total_retail_cents,
              via,
              whoName,
              clientLabel,
              serviceName: firstService?.name ?? null,
              serviceIcon: firstService?.icon ?? "•",
              projectCount: j.projects?.length ?? 0,
              firstProjectId: firstProject?.id ?? null,
              dateLabel: new Date(j.created_at).toLocaleDateString("en-AU", {
                day: "2-digit", month: "short",
              }),
            };
          })} />
        )}
      </main>
    </>
  );
}

function Stat({ label, value, accent = "var(--color-muted)" }) {
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

