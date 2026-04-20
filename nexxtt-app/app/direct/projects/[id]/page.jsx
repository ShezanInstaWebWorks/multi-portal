import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DirectTopbar } from "@/components/layout/DirectTopbar";
import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";

export const metadata = { title: "Project · nexxtt.io", robots: "noindex, nofollow" };

export default async function DirectProjectDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, job_id, service_id, status, retail_price_cents, is_rush, due_date, delivered_at, approved_at, revision_count, created_at, updated_at"
    )
    .eq("id", id)
    .single();
  if (!project) notFound();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, direct_client_user_id")
    .eq("id", project.job_id)
    .single();

  if (!job || job.direct_client_user_id !== user.id) notFound();

  const [serviceRes, briefRes, filesRes] = await Promise.all([
    supabase.from("services").select("id, name, icon, slug").eq("id", project.service_id).single(),
    supabase.from("briefs").select("data, submitted_at").eq("project_id", project.id).maybeSingle(),
    supabase.from("delivered_files").select("id, name, size_bytes, uploaded_at").eq("project_id", project.id).order("uploaded_at", { ascending: false }),
  ]);

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <DirectTopbar title={serviceRes.data?.name ?? "Project"} />
      </Suspense>
      <main id="main-content" className="flex-1">
        <ProjectDetailView
          viewer="direct_client"
          project={project}
          service={serviceRes.data}
          brief={briefRes.data}
          files={filesRes.data ?? []}
          job={job}
          backHref={`/direct/orders/${job.id}`}
          backLabel={`Back to order ${job.job_number}`}
        />
      </main>
    </>
  );
}
