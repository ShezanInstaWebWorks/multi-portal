import { notFound } from "next/navigation";
import { ClientProjectList } from "@/components/client-portal/ClientProjectList";
import { EmptyState } from "@/components/shared/EmptyState";
import { resolvePortalContext } from "@/lib/portal-context";
import { WalletCard } from "@/components/wallet/WalletCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCents } from "@/lib/money";

function computeClientStats(jobs) {
  let totalProjects = 0;
  let inProgress = 0;
  let completed = 0;
  let totalSpent = 0;

  for (const j of jobs) {
    totalSpent += j.total_retail_cents ?? 0;
    for (const p of j.projects ?? []) {
      totalProjects += 1;
      if (p.status === "in_progress" || p.status === "in_review" || p.status === "brief_pending") {
        inProgress += 1;
      }
      if (p.status === "delivered" || p.status === "approved") {
        completed += 1;
      }
    }
  }

  return { totalProjects, inProgress, completed, totalSpent };
}

export default async function ClientPortalHomePage({ params }) {
  const { agencySlug, clientSlug } = await params;

  // Layout has already verified user, brand and client; this hits the
  // request-scoped cache so it's effectively free.
  const { supabase, admin, brand, client } = await resolvePortalContext(agencySlug, clientSlug);
  if (!brand || !client) notFound();

  // Fetch jobs + nested projects via the session (RLS enforced).
  // NOTE: we intentionally exclude cost fields — the client never sees cost or profit.
  //
  // If the viewer is an agency-of-record or admin, the session RLS may not match
  // (they have agency scope, not client scope). Fall back to admin client in that
  // case — the layout has already authorized them.
  const { data: jobsViaSession } = await supabase
    .from("jobs")
    .select(
      `id, job_number, status, is_rush, total_retail_cents, created_at,
       projects ( id, status, retail_price_cents, is_rush, due_date,
                  services ( id, name, icon, slug ) )`
    )
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  let jobs = jobsViaSession ?? [];
  if (jobs.length === 0) {
    // agency preview / admin preview: fall back to service-role fetch (layout
    // already verified their access).
    const { data: jobsViaAdmin } = await admin
      .from("jobs")
      .select(
        `id, job_number, status, is_rush, total_retail_cents, created_at,
         projects ( id, status, retail_price_cents, is_rush, due_date,
                    services ( id, name, icon, slug ) )`
      )
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });
    jobs = jobsViaAdmin ?? [];
  }

  // Greeting uses first name of the client contact, not the viewer's name.
  const firstName = (client.contact_name ?? "").split(/\s+/)[0] || "there";
  const stats = computeClientStats(jobs);

  // Flatten projects for the table
  const allProjects = [];
  for (const j of jobs) {
    for (const p of j.projects ?? []) {
      allProjects.push({
        id: p.id,
        jobNumber: j.job_number,
        service: p.services?.name ?? "Service",
        icon: p.services?.icon ?? "📦",
        status: p.status,
        date: p.due_date ? new Date(p.due_date).toLocaleDateString('en-AU') : '—',
        amount: p.retail_price_cents ?? 0,
      });
    }
  }

  return (
    <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-4 lg:py-5 pb-16 lg:pb-8">
      {/* Hero greeting — compact one-line header */}
      <div className="mb-6 flex items-baseline gap-2 flex-wrap">
        <span
          className="text-[0.65rem] font-bold uppercase"
          style={{ letterSpacing: "0.1em", color: "var(--color-muted)" }}
        >
          {brand.display_name}
        </span>
        <h1 className="font-display text-[1.15rem] lg:text-[1.3rem] font-extrabold text-dark tracking-tight">
          Welcome back, {firstName}
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Total Projects</span>
            <span className="text-xl">📁</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">In Progress</span>
            <span className="text-xl">⚡</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.inProgress}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Completed</span>
            <span className="text-xl">✅</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Total Spent</span>
            <span className="text-xl">💰</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCents(stats.totalSpent)}</div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    No projects yet
                  </td>
                </tr>
              ) : (
                allProjects.slice(0, 10).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-medium text-gray-900">{p.jobNumber}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{p.icon}</span>
                        <span className="text-sm text-gray-600">{p.service}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{p.date}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 text-right">{formatCents(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {jobs.length === 0 && (
        <EmptyState
          icon="📋"
          title="No projects yet"
          description="Your agency will let you know as soon as work begins. You'll see it here first."
        />
      )}
    </main>
  );
}
