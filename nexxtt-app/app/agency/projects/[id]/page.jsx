import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";
import { resolveAgencyContext } from "@/lib/impersonation";

export const metadata = { title: "Project · nexxtt.io", robots: "noindex, nofollow" };

export default async function AgencyProjectDetailPage({ params }) {
  const { id } = await params;
  const ctx = await resolveAgencyContext();
  if (!ctx.user) redirect("/login");

  const { data: project } = await ctx.supabase
    .from("projects")
    .select(
      "id, job_id, service_id, status, cost_price_cents, retail_price_cents, is_rush, due_date, delivered_at, approved_at, revision_count, created_at, updated_at"
    )
    .eq("id", id)
    .single();
  if (!project) notFound();

  const { data: job } = await ctx.supabase
    .from("jobs")
    .select("id, job_number, agency_id, client_id")
    .eq("id", project.job_id)
    .single();

  // Authorisation: if we have an agency context, the job must belong to that agency.
  if (ctx.agencyId && job?.agency_id !== ctx.agencyId) notFound();

  const [serviceRes, briefRes, filesRes] = await Promise.all([
    ctx.supabase.from("services").select("id, name, icon, slug").eq("id", project.service_id).single(),
    ctx.supabase.from("briefs").select("data, submitted_at, updated_at").eq("project_id", project.id).maybeSingle(),
    ctx.supabase.from("delivered_files").select("id, name, size_bytes, uploaded_at").eq("project_id", project.id).order("uploaded_at", { ascending: false }),
  ]);

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title={serviceRes.data?.name ?? "Project"} />
      </Suspense>
      <main id="main-content" className="flex-1">
        <ProjectDetailView
          viewer="agency"
          project={project}
          service={serviceRes.data}
          brief={briefRes.data}
          files={filesRes.data ?? []}
          job={job}
          backHref={`/agency/orders/${job?.id}`}
          backLabel={`Back to order ${job?.job_number ?? ""}`}
        />
      </main>
    </>
  );
}
