import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DirectTopbar } from "@/components/layout/DirectTopbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata = {
  title: "Dashboard · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function DirectDashboardPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, first_name")
    .eq("id", user.id)
    .single();

  const firstName = profile?.first_name ?? "there";

  // Direct clients see their own jobs via `jobs_direct_client_view` RLS.
  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      `id, job_number, status, created_at,
       projects ( id, status, due_date, is_rush,
                  services ( name, icon, slug ) )`
    )
    .eq("direct_client_user_id", user.id)
    .order("created_at", { ascending: false });

  const allProjects = (jobs ?? []).flatMap((j) =>
    (j.projects ?? []).map((p) => ({ ...p, job_id: j.id, job_number: j.job_number }))
  );

  const stats = {
    active:        allProjects.filter((p) => ["brief_pending", "in_progress"].includes(p.status)).length,
    inReview:      allProjects.filter((p) => p.status === "in_review").length,
    delivered:     allProjects.filter((p) => p.status === "delivered").length,
    briefsPending: allProjects.filter((p) => p.status === "brief_pending").length,
  };

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <DirectTopbar title="Dashboard" />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        {/* Welcome banner */}
        <div
          className="relative overflow-hidden rounded-[22px] p-6 mb-6 flex items-center justify-between gap-4 flex-wrap"
          style={{
            background: "linear-gradient(135deg, var(--color-navy), #0f2d50)",
          }}
        >
          <div
            className="absolute -right-10 -top-14 w-[200px] h-[200px] rounded-full pointer-events-none"
            style={{ background: "rgba(0,184,169,0.06)" }}
          />
          <div className="relative z-[1]">
            <div className="font-display text-[1.2rem] font-extrabold text-white mb-1">
              Welcome back, {firstName} 👋
            </div>
            <div className="text-[0.85rem] text-white/45">
              {stats.inReview > 0 ? (
                <>
                  You have{" "}
                  <strong style={{ color: "var(--color-amber)" }}>
                    {stats.inReview} project{stats.inReview === 1 ? "" : "s"} awaiting your review
                  </strong>{" "}
                  {stats.active > 0 && `and ${stats.active} active in production.`}
                </>
              ) : stats.active > 0 ? (
                <>
                  <strong className="text-white">{stats.active}</strong> project
                  {stats.active === 1 ? "" : "s"} in production.
                </>
              ) : (
                "No active projects — place your first order to get started."
              )}
            </div>
          </div>
          <Link
            href="/direct/orders"
            className="relative z-[1] px-3.5 py-2 rounded-[10px] text-sm font-semibold"
            style={{
              background: "rgba(255,255,255,0)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            View All Projects →
          </Link>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Stat label="Active Projects"       value={stats.active}        sub="In production"    subColor="var(--color-teal)" accent="var(--color-teal)" />
          <Stat label="Awaiting Your Review"  value={stats.inReview}      sub={stats.inReview > 0 ? "Action needed" : "All caught up"} valueColor={stats.inReview > 0 ? "var(--color-amber)" : undefined} subColor={stats.inReview > 0 ? "var(--color-amber)" : "var(--color-muted)"} accent="var(--color-amber)" />
          <Stat label="Delivered"              value={stats.delivered}     sub="Completed projects" accent="var(--color-green)" />
          <Stat label="Briefs Pending"         value={stats.briefsPending} sub={stats.briefsPending === 0 ? "All submitted ✓" : "Need your input"} subColor={stats.briefsPending === 0 ? "var(--color-teal)" : "var(--color-amber)"} accent="#3b82f6" />
        </div>

        {/* Projects list */}
        {allProjects.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No projects yet"
            description="Place your first order — once briefing's done, you'll see live progress here."
            action={
              <Link
                href="/direct/orders/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white"
                style={{
                  background: "var(--color-teal)",
                  boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
                }}
              >
                + Place a new order
              </Link>
            }
          />
        ) : (
          <section>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="font-display text-[1.15rem] font-extrabold text-dark">
                  Your projects
                </h2>
                <p className="text-sm text-muted">All active and recent work</p>
              </div>
              <Link
                href="/direct/orders"
                className="text-[0.82rem] font-semibold text-teal hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden">
              {/* Desktop table */}
              <table className="hidden md:table w-full">
                <thead>
                  <tr className="bg-off">
                    {["Project", "Due", "Status"].map((h) => (
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
                  {allProjects.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-teal-pale transition-colors ${
                        i < allProjects.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[0.95rem] shrink-0"
                            style={{
                              background: "var(--color-teal-pale)",
                              color: "var(--color-teal)",
                            }}
                          >
                            {p.services?.icon ?? "•"}
                          </div>
                          <div>
                            <div className="font-semibold text-dark">
                              {p.services?.name ?? "Project"}
                            </div>
                            <div className="text-[0.72rem] text-muted">
                              #{p.job_number}
                              {p.is_rush && " · Rush"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body text-[0.85rem]">
                        {p.due_date
                          ? new Date(p.due_date).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="md:hidden flex flex-col">
                {allProjects.map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < allProjects.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[0.95rem] shrink-0"
                      style={{
                        background: "var(--color-teal-pale)",
                        color: "var(--color-teal)",
                      }}
                    >
                      {p.services?.icon ?? "•"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-dark text-[0.88rem]">
                        {p.services?.name ?? "Project"}
                      </div>
                      <div className="text-[0.72rem] text-muted">
                        #{p.job_number}
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </div>
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
      <div
        className="text-[11px] font-bold text-muted uppercase mb-2"
        style={{ letterSpacing: "0.08em" }}
      >
        {label}
      </div>
      <div
        className="font-display text-[1.9rem] font-extrabold leading-none"
        style={{ color: valueColor ?? "var(--color-dark)" }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[0.78rem] mt-1.5"
          style={{ color: subColor ?? "var(--color-muted)" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
