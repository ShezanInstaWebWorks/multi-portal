import { notFound } from "next/navigation";
import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";
import { signDeliveredFiles } from "@/lib/delivered-files";
import { getLatestRevisionNote } from "@/lib/revision-notes";
import { resolvePortalContext } from "@/lib/portal-context";
import { TaskBoard } from "@/components/project-workspace/TaskBoard";
import { TaskProgress } from "@/components/project-workspace/TaskProgress";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ProjectWorkspaceRealtime } from "@/components/project-workspace/ProjectWorkspaceRealtime";
import { ProjectTabs } from "@/components/project-workspace/ProjectTabs";

export const metadata = { title: "Project · Client portal", robots: "noindex, nofollow" };

export default async function ClientProjectDetailPage({ params, searchParams }) {
  const { agencySlug, clientSlug, id } = await params;
  const sp = (await searchParams) ?? {};
  const tab = sp.tab === "tasks" || sp.tab === "chat" ? sp.tab : "overview";

  // Layout already validated brand/client/user; this hits the request cache.
  // Kick off the project read in parallel — it depends only on `id`.
  const ctxPromise = resolvePortalContext(agencySlug, clientSlug);
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

  // Workspace extras: per-project chat + read-only task board
  const { user } = await ctxPromise;
  const [tasksRes, conversationRes] = await Promise.all([
    admin.from("project_tasks").select("*").eq("project_id", project.id).order("sort_order"),
    admin.from("conversations").select("id").eq("tier", "project").eq("project_id", project.id).maybeSingle(),
  ]);
  const tasks = tasksRes.data ?? [];
  const conversationId = conversationRes.data?.id ?? null;
  const revisionNote = project.status === "revision_requested"
    ? await getLatestRevisionNote(admin, project.id)
    : null;
  const { data: messages } = conversationId
    ? await admin.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200)
    : { data: [] };

  return (
    <>
      <ProjectWorkspaceRealtime projectId={project.id} conversationId={conversationId} />
      {tab === "overview" && (
        <ProjectDetailView
          viewer="agency_client"
          project={project}
          service={svcRes.data}
          brief={briefRes.data}
          files={signedFiles}
          job={jobRes.data}
          backHref={`/portal/${agencySlug}/${clientSlug}`}
          backLabel="Back to projects"
          tabsSlot={<ProjectTabs />}
          revisionNote={revisionNote}
        />
      )}

      {tab !== "overview" && (
        <section className="px-4 sm:px-6 lg:px-8 pt-5 lg:pt-7 pb-16 max-w-[1200px] mx-auto w-full">
          <ProjectTabs />
          {tab === "tasks" && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <h2 className="font-display text-[1rem] font-extrabold text-dark">Tasks</h2>
                <TaskProgress tasks={tasks} />
              </div>
              <TaskBoard projectId={project.id} tasks={tasks} canEdit={false} />
            </div>
          )}
          {tab === "chat" && (
            <ChatPanel
              conversationId={conversationId}
              initialMessages={messages ?? []}
              currentUserId={user.id}
              placeholder="Message the project team…"
              projectStatus={project.status}
              variant="wide"
            />
          )}
        </section>
      )}
    </>
  );
}
