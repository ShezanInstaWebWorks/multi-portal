import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";

export const metadata = { title: "Project · Client portal", robots: "noindex, nofollow" };

export default async function ClientProjectDetailPage({ params }) {
  const { agencySlug, clientSlug, id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Layout has already validated the slugs + viewer; duplicate resolution here.
  const admin = createAdminSupabaseClient();
  const { data: brand } = await admin
    .from("agency_brands")
    .select("agency_id")
    .eq("portal_slug", agencySlug)
    .maybeSingle();
  if (!brand) notFound();

  const { data: client } = await admin
    .from("clients")
    .select("id, portal_user_id")
    .eq("agency_id", brand.agency_id)
    .eq("portal_slug", clientSlug)
    .maybeSingle();
  if (!client) notFound();

  // Read the project via session RLS first; fall back to admin for agency/admin preview.
  let project = null;
  let job = null;
  let service = null;
  let brief = null;
  let files = [];

  const viaSession = await supabase
    .from("projects")
    .select(
      "id, job_id, service_id, status, retail_price_cents, is_rush, due_date, delivered_at, approved_at, revision_count, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (viaSession.data) {
    project = viaSession.data;
    const [jobRes, svcRes, briefRes, filesRes] = await Promise.all([
      supabase.from("jobs").select("id, job_number, client_id").eq("id", project.job_id).single(),
      supabase.from("services").select("id, name, icon, slug").eq("id", project.service_id).single(),
      supabase.from("briefs").select("data, submitted_at").eq("project_id", project.id).maybeSingle(),
      supabase.from("delivered_files").select("id, name, size_bytes, uploaded_at").eq("project_id", project.id),
    ]);
    job = jobRes.data;
    service = svcRes.data;
    brief = briefRes.data;
    files = filesRes.data ?? [];
  } else {
    // agency/admin preview path: use service-role
    const [projRes, jobResA] = await Promise.all([
      admin
        .from("projects")
        .select("id, job_id, service_id, status, retail_price_cents, is_rush, due_date, delivered_at, approved_at, revision_count, created_at, updated_at")
        .eq("id", id)
        .maybeSingle(),
      admin.from("jobs").select("id, job_number, client_id").eq("id", (await admin.from("projects").select("job_id").eq("id", id).single()).data?.job_id ?? "").maybeSingle(),
    ]);
    if (!projRes.data) notFound();
    project = projRes.data;
    job = jobResA.data;
    const [svcRes, briefRes, filesRes] = await Promise.all([
      admin.from("services").select("id, name, icon, slug").eq("id", project.service_id).single(),
      admin.from("briefs").select("data, submitted_at").eq("project_id", project.id).maybeSingle(),
      admin.from("delivered_files").select("id, name, size_bytes, uploaded_at").eq("project_id", project.id),
    ]);
    service = svcRes.data;
    brief = briefRes.data;
    files = filesRes.data ?? [];
  }

  if (!project || !job || job.client_id !== client.id) notFound();

  return (
    <ProjectDetailView
      viewer="agency_client"
      project={project}
      service={service}
      brief={brief}
      files={files}
      job={job}
      backHref={`/portal/${agencySlug}/${clientSlug}`}
      backLabel="Back to projects"
    />
  );
}
