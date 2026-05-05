import { Suspense } from "react";
import { notFound } from "next/navigation";
import { resolvePortalContext } from "@/lib/portal-context";
import { PortalTopbar } from "@/components/layout/PortalTopbar";
import { ClientProjectsList } from "@/components/orders/ClientProjectsList";
import { EmptyState } from "@/components/shared/EmptyState";

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

        {jobs.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No projects yet"
            description="Your agency will place orders on your behalf. Once projects are underway, you'll see them here."
          />
        ) : (
          <ClientProjectsList
            jobs={jobs}
            agencySlug={agencySlug}
            clientSlug={clientSlug}
            brand={brand}
          />
        )}
      </main>
    </>
  );
}
