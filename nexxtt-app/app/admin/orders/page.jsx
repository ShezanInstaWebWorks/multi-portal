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

  // Count pending orders for the alert badge — always fetched regardless of filter.
  const { count: pendingCount } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_admin_approval");

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
        <p className="text-sm text-muted mb-4">
          Every job across agency + direct portals.
        </p>

        {/* Pending approval alert */}
        {pendingCount > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-[12px] mb-5 border"
            style={{
              background: "rgba(245,158,11,0.07)",
              borderColor: "rgba(245,158,11,0.3)",
            }}
          >
            <span className="text-[1.1rem]">⏳</span>
            <div className="flex-1">
              <div className="text-[0.88rem] font-bold text-dark">
                {pendingCount} order{pendingCount === 1 ? "" : "s"} awaiting your approval
              </div>
              <div className="text-[0.75rem] text-muted">
                Review and confirm or reject before work can begin.
              </div>
            </div>
            <a
              href="?status=pending_admin_approval"
              className="px-4 py-1.5 rounded-[8px] text-[0.78rem] font-bold text-white whitespace-nowrap"
              style={{ background: "var(--color-amber)" }}
            >
              Review →
            </a>
          </div>
        )}

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap mb-5">
          {[
            { label: "All orders",       value: null },
            { label: "⏳ Pending approval", value: "pending_admin_approval" },
            { label: "Brief pending",    value: "brief_pending" },
            { label: "In progress",      value: "in_progress" },
            { label: "In review",        value: "in_review" },
            { label: "Delivered",        value: "delivered" },
            { label: "Rejected",         value: "rejected" },
          ].map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <a
                key={tab.label}
                href={tab.value ? `?status=${tab.value}` : "?"}
                className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold border transition-colors ${
                  active
                    ? "bg-navy text-white border-navy"
                    : "bg-white text-muted border-border hover:border-navy hover:text-dark"
                }`}
              >
                {tab.label}
                {tab.value === "pending_admin_approval" && pendingCount > 0 && (
                  <span
                    className="ml-1.5 px-1.5 py-px rounded-full text-[0.65rem] font-bold"
                    style={{ background: active ? "rgba(255,255,255,0.2)" : "rgba(245,158,11,0.15)", color: active ? "white" : "var(--color-amber)" }}
                  >
                    {pendingCount}
                  </span>
                )}
              </a>
            );
          })}
        </div>

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
            const projectList = j.projects ?? [];
            const firstProject = projectList[0];
            // De-dup services so a job with two "Logo Design" projects only
            // shows the service once. Order preserved by first appearance.
            const seen = new Set();
            const services = [];
            for (const p of projectList) {
              const s = p.services;
              if (!s || seen.has(s.name)) continue;
              seen.add(s.name);
              services.push({ name: s.name, icon: s.icon ?? "•" });
            }
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
              services,
              projectCount: projectList.length,
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

