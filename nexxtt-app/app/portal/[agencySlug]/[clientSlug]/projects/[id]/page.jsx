import { notFound } from "next/navigation";
import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";
import { signDeliveredFiles } from "@/lib/delivered-files";
import { resolvePortalContext } from "@/lib/portal-context";

export const metadata = { title: "Project · Client portal", robots: "noindex, nofollow" };

export default async function ClientProjectDetailPage({ params }) {
  const { agencySlug, clientSlug, id } = await params;

  // Layout already validated brand/client/user; this hits the request cache.
  // Kick off the project read in parallel — it depends only on `id`.
  const ctxPromise = resolvePortalContext(agencySlug, clientSlug);
  const projectPromise = (async () => {
    const { admin } = await ctxPromise;
    return admin
      .from("projects")
      .select(
        "id, job_id, service_id, status, retail_price_cents, is_rush, due_date, delivered_at, approved_at, revision_count, created_at, updated_at"
      )
      .eq("id", id)
      .maybeSingle();
  })();

  const { admin, client } = await ctxPromise;
  if (!client) notFound();
  const { data: project } = await projectPromise;
  if (!project) notFound();

  // Fan out everything dependent on the project row.
  const [jobRes, svcRes, briefRes, filesRes] = await Promise.all([
    admin.from("jobs").select("id, job_number, client_id").eq("id", project.job_id).single(),
    admin.from("services").select("id, name, icon, slug").eq("id", project.service_id).single(),
    admin.from("briefs").select("data, submitted_at").eq("project_id", project.id).maybeSingle(),
    admin
      .from("delivered_files")
      .select("id, name, size_bytes, mime_type, storage_path, uploaded_at")
      .eq("project_id", project.id),
  ]);

  if (!jobRes.data || jobRes.data.client_id !== client.id) notFound();

  const signedFiles = await signDeliveredFiles(filesRes.data ?? []);

  return (
    <ProjectDetailView
      viewer="agency_client"
      project={project}
      service={svcRes.data}
      brief={briefRes.data}
      files={signedFiles}
      job={jobRes.data}
      backHref={`/portal/${agencySlug}/${clientSlug}`}
      backLabel="Back to projects"
    />
  );
}
