import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePortalContext } from "@/lib/portal-context";
import { PortalTopbar } from "@/components/layout/PortalTopbar";
import { ClientOrderList } from "@/components/client-portal/ClientOrderList";
import { ClipboardList } from "lucide-react";

function computeClientStats(jobs) {
  let totalProjects = 0;
  let inProgress = 0;
  let completed = 0;
  let inReview = 0;

  for (const j of jobs) {
    for (const p of j.projects ?? []) {
      totalProjects += 1;
      if (p.status === "in_progress" || p.status === "agency_review") inProgress += 1;
      if (p.status === "in_review") inReview += 1;
      if (p.status === "delivered" || p.status === "approved") completed += 1;
    }
  }
  return { totalProjects, inProgress, inReview, completed };
}

export default async function ClientPortalHomePage({ params }) {
  const { agencySlug, clientSlug } = await params;

  const { supabase, admin, brand, client } = await resolvePortalContext(agencySlug, clientSlug);
  if (!brand || !client) notFound();

  const select = `id, job_number, status, is_rush, total_retail_cents, created_at,
    projects ( id, status, retail_price_cents, is_rush, due_date,
               services ( id, name, icon, slug ) )`;

  const { data: jobsViaSession } = await supabase
    .from("jobs")
    .select(select)
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  let jobs = jobsViaSession ?? [];
  if (jobs.length === 0) {
    const { data: jobsViaAdmin } = await admin
      .from("jobs")
      .select(select)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });
    jobs = jobsViaAdmin ?? [];
  }

  // Filter out jobs still awaiting admin approval — client shouldn't see them yet.
  jobs = jobs.filter((j) => j.status !== "pending_admin_approval");

  const firstName = (client.contact_name ?? "").split(/\s+/)[0] || "there";
  const stats = computeClientStats(jobs);
  const hasJobs = jobs.some((j) => (j.projects ?? []).length > 0);

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <PortalTopbar title="Dashboard" />
      </Suspense>

      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">

        {/* Welcome banner */}
        <div
          className="relative overflow-hidden rounded-[22px] p-6 mb-6 flex items-center justify-between gap-4 flex-wrap"
          style={{
            background: `linear-gradient(135deg, ${brand.primary_colour ?? "#0B1F3A"}, #0f2d50)`,
          }}
        >
          <div
            className="absolute -right-10 -top-14 w-50 h-50 rounded-full pointer-events-none"
            style={{ background: "rgba(0,184,169,0.06)" }}
          />
          <div className="relative z-1">
            <div className="font-display text-[1.2rem] font-extrabold text-white mb-1">
              Welcome back, {firstName} 👋
            </div>
            <div className="text-[0.85rem] text-white/45">
              {stats.inReview > 0 ? (
                <>
                  You have{" "}
                  <strong style={{ color: brand.accent_colour ?? "#00B8A9" }}>
                    {stats.inReview} project{stats.inReview === 1 ? "" : "s"} awaiting your review
                  </strong>
                  {stats.inProgress > 0 && ` and ${stats.inProgress} active in production`}.
                  {" "}Please review and approve or request changes.
                </>
              ) : stats.inProgress > 0 ? (
                <>
                  <strong className="text-white">{stats.inProgress}</strong> project
                  {stats.inProgress === 1 ? "" : "s"} in production — we&apos;ll notify you when ready.
                </>
              ) : (
                "No active projects yet. Your agency will place orders on your behalf."
              )}
            </div>
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Stat label="Total Projects" value={stats.totalProjects} sub="All time" accent={brand.accent_colour ?? "var(--color-teal)"} />
          <Stat label="In Progress" value={stats.inProgress} sub="Active production" accent="#3b82f6" />
          <Stat label="Completed" value={stats.completed} sub="Delivered projects" accent="var(--color-green)" />
          <Stat
            label="Awaiting Review"
            value={stats.inReview}
            sub={stats.inReview > 0 ? "Action needed" : "All caught up"}
            valueColor={stats.inReview > 0 ? "var(--color-amber)" : undefined}
            subColor={stats.inReview > 0 ? "var(--color-amber)" : "var(--color-muted)"}
            accent="var(--color-amber)"
          />
        </div>

        {/* Orders + projects grouped list */}
        {!hasJobs ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <ClipboardList className="w-12 h-12 mb-4 text-muted opacity-30" />
            <h3
              className="font-display font-bold text-lg mb-2"
              style={{ color: brand.accent_colour ?? "var(--color-teal)" }}
            >
              No projects yet
            </h3>
            <p className="text-muted text-sm max-w-xs leading-relaxed">
              Your agency will place orders on your behalf. Once projects are underway, you&apos;ll see them here.
            </p>
          </div>
        ) : (
          <section>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="font-display text-[1.15rem] font-extrabold text-dark">
                  Your orders
                </h2>
                <p className="text-sm text-muted">Click an order to see its projects</p>
              </div>
            </div>

            <ClientOrderList
              jobs={jobs}
              agencySlug={agencySlug}
              clientSlug={clientSlug}
              accentColor={brand.accent_colour ?? "#00B8A9"}
            />
          </section>
        )}
      </main>
    </>
  );
}

function Stat({ label, value, sub, accent, valueColor, subColor }) {
  return (
    <div className="relative bg-white border border-border rounded-xl p-5 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
      <div className="text-[11px] font-bold text-muted uppercase mb-2" style={{ letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div className="font-display text-[1.9rem] font-extrabold leading-none" style={{ color: valueColor ?? "var(--color-dark)" }}>
        {value}
      </div>
      {sub && (
        <div className="text-[0.78rem] mt-1.5" style={{ color: subColor ?? "var(--color-muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
