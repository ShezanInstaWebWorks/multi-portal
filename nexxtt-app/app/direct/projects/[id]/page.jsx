import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { DirectTopbar } from "@/components/layout/DirectTopbar";
import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";
import { signDeliveredFiles } from "@/lib/delivered-files";
import { getLatestRevisionNote } from "@/lib/revision-notes";
import { TaskBoard } from "@/components/project-workspace/TaskBoard";
import { TaskProgress } from "@/components/project-workspace/TaskProgress";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ProjectWorkspaceRealtime } from "@/components/project-workspace/ProjectWorkspaceRealtime";
import { ProjectTabs } from "@/components/project-workspace/ProjectTabs";

export const metadata = { title: "Project · nexxtt.io", robots: "noindex, nofollow" };

export default async function DirectProjectDetailPage({ params, searchParams }) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const tab = sp.tab === "tasks" || sp.tab === "chat" ? sp.tab : "overview";
  const isEmbed = sp.embed === "1";
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Single round-trip via nested selects.
  const { data: project } = await supabase
    .from("projects")
    .select(
      `id, job_id, service_id, status, retail_price_cents, is_rush, start_date, due_date,
       delivered_at, approved_at, revision_count, created_at, updated_at,
       jobs ( id, job_number, direct_client_user_id ),
       services ( id, name, icon, slug )`
    )
    .eq("id", id)
    .single();
  if (!project) notFound();
  const job = project.jobs;
  if (!job || job.direct_client_user_id !== user.id) notFound();

  const [briefRes, filesRes] = await Promise.all([
    supabase.from("briefs").select("data, submitted_at").eq("project_id", project.id).maybeSingle(),
    supabase
      .from("delivered_files")
      .select("id, name, size_bytes, mime_type, storage_path, uploaded_at")
      .eq("project_id", project.id)
      .order("uploaded_at", { ascending: false }),
  ]);
  const serviceRes = { data: project.services ?? null };
  const signedFiles = await signDeliveredFiles(filesRes.data ?? []);

  // Workspace extras
  const adminClient = createAdminSupabaseClient();
  const [tasksRes, conversationRes] = await Promise.all([
    adminClient.from("project_tasks").select("*").eq("project_id", project.id).order("sort_order"),
    adminClient.from("conversations").select("id").eq("tier", "project").eq("project_id", project.id).maybeSingle(),
  ]);
  const tasks = tasksRes.data ?? [];
  const conversationId = conversationRes.data?.id ?? null;
  const revisionNote = project.status === "revision_requested"
    ? await getLatestRevisionNote(adminClient, project.id)
    : null;
  const { data: messages } = conversationId
    ? await adminClient.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200)
    : { data: [] };

  return (
    <>
      {!isEmbed && (
        <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
          <DirectTopbar title={serviceRes.data?.name ?? "Project"} />
        </Suspense>
      )}
      <main id="main-content" className={`flex-1 ${isEmbed ? "pt-1" : ""}`}>
        <ProjectWorkspaceRealtime projectId={project.id} conversationId={conversationId} />
        {tab === "overview" && (
          <ProjectDetailView
            viewer="direct_client"
            project={project}
            service={serviceRes.data}
            brief={briefRes.data}
            files={signedFiles}
            job={job}
            backHref={`/direct/orders/${job.id}`}
            backLabel={`Back to order ${job.job_number}`}
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
                placeholder="Message the nexxtt.io team…"
                projectStatus={project.status}
                variant="wide"
              />
            )}
          </section>
        )}
      </main>
    </>
  );
}
