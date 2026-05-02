import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePortalContext } from "@/lib/portal-context";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PortalTopbar } from "@/components/layout/PortalTopbar";

export const metadata = { title: "My Projects · nexxtt.io", robots: "noindex, nofollow" };

export default async function ClientPortalProjectsPage({ params }) {
  const { agencySlug, clientSlug } = await params;

  const { supabase, admin, brand, client } = await resolvePortalContext(agencySlug, clientSlug);
  if (!brand || !client) notFound();

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

  const allProjects = [];
  for (const j of jobs) {
    for (const p of j.projects ?? []) {
      allProjects.push({
        id: p.id,
        job_id: j.id,
        job_number: j.job_number,
        service: p.services?.name ?? "Service",
        icon: p.services?.icon ?? "📦",
        status: p.status,
        due_date: p.due_date,
        amount: p.retail_price_cents ?? 0,
      });
    }
  }

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <PortalTopbar title="My Projects" />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1100px] mx-auto w-full">
        <h1 className="font-display text-[1.4rem] font-extrabold text-dark mb-1">
          My Projects
        </h1>
        <p className="text-sm text-muted mb-6">
          Track progress, review deliverables, and approve completed work.
        </p>

        {allProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="text-5xl mb-4 opacity-30">📋</div>
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
                    className={`hover:bg-teal-pale transition-colors cursor-pointer ${
                      i < allProjects.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/portal/${agencySlug}/${clientSlug}/projects/${p.id}`} className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[0.95rem] shrink-0"
                          style={{
                            background: "var(--color-teal-pale)",
                            color: brand.accent_colour ?? "var(--color-teal)",
                          }}
                        >
                          {p.icon ?? "•"}
                        </div>
                        <div>
                          <div className="font-semibold text-dark">
                            {p.service}
                          </div>
                          <div className="text-[0.72rem] text-muted">
                            #{p.job_number}
                            {p.is_rush && " · Rush"}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-body text-[0.85rem]">
                      {p.due_date
                        ? new Date(p.due_date).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/portal/${agencySlug}/${clientSlug}/projects/${p.id}`}>
                        <StatusBadge status={p.status} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col">
              {allProjects.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/portal/${agencySlug}/${clientSlug}/projects/${p.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-teal-pale transition-colors ${
                    i < allProjects.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[0.95rem] shrink-0"
                    style={{
                      background: "var(--color-teal-pale)",
                      color: brand.accent_colour ?? "var(--color-teal)",
                    }}
                  >
                    {p.icon ?? "•"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-dark text-[0.88rem]">
                      {p.service}
                    </div>
                    <div className="text-[0.72rem] text-muted">
                      #{p.job_number}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
