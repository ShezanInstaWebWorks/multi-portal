import { notFound } from "next/navigation";
import { signDeliveredFiles } from "@/lib/delivered-files";
import { getLatestRevisionNote } from "@/lib/revision-notes";
import { resolvePortalContext } from "@/lib/portal-context";
import { ClientPortalProjectView } from "@/components/client-portal/ClientPortalProjectView";
import { ProjectWorkspaceRealtime } from "@/components/project-workspace/ProjectWorkspaceRealtime";

export const metadata = { title: "Project · Client portal", robots: "noindex, nofollow" };

export default async function ClientProjectDetailPage({ params }) {
  const { agencySlug, clientSlug, id } = await params;

  const ctxPromise = resolvePortalContext(agencySlug, clientSlug);

  // Kick off the project read immediately — depends only on `id`.
  const projectPromise = (async () => {
    const { admin } = await ctxPromise;
    return admin
      .from("projects")
      .select(
        "id, job_id, service_id, status, retail_price_cents, is_rush, start_date, due_date, delivered_at, approved_at, revision_count, created_at, updated_at"
      )
      .eq("id", id)
      .maybeSingle();
  })();

  const { admin, client, brand } = await ctxPromise;
  if (!client) notFound();

  const { data: project } = await projectPromise;
  if (!project) notFound();

  const [jobRes, svcRes, briefRes, filesRes] = await Promise.all([
    admin.from("jobs").select("id, job_number, client_id").eq("id", project.job_id).single(),
    admin.from("services").select("id, name, icon, slug").eq("id", project.service_id).single(),
    admin.from("briefs").select("data, submitted_at").eq("project_id", project.id).maybeSingle(),
    admin
      .from("delivered_files")
      .select("id, name, size_bytes, mime_type, storage_path, uploaded_at")
      .eq("project_id", project.id)
      .order("uploaded_at", { ascending: false }),
  ]);

  if (!jobRes.data || jobRes.data.client_id !== client.id) notFound();

  const signedFiles = await signDeliveredFiles(filesRes.data ?? []);

  const { user } = await ctxPromise;
  const [conversationRes] = await Promise.all([
    admin
      .from("conversations")
      .select("id")
      .eq("tier", "project")
      .eq("project_id", project.id)
      .maybeSingle(),
  ]);

  const conversationId = conversationRes.data?.id ?? null;

  const revisionNote =
    project.status === "revision_requested"
      ? await getLatestRevisionNote(admin, project.id)
      : null;

  const { data: messages } = conversationId
    ? await admin
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200)
    : { data: [] };

  return (
    <>
      <ProjectWorkspaceRealtime projectId={project.id} conversationId={conversationId} />
      <ClientPortalProjectView
        project={project}
        service={svcRes.data}
        brief={briefRes.data}
        files={signedFiles}
        job={jobRes.data}
        brand={brand}
        agencySlug={agencySlug}
        clientSlug={clientSlug}
        conversationId={conversationId}
        initialMessages={messages ?? []}
        currentUserId={user?.id ?? null}
        revisionNote={revisionNote}
      />
    </>
  );
}
