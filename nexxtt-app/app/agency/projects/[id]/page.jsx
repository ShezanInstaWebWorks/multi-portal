import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";
import { resolveAgencyContext } from "@/lib/impersonation";
import { signDeliveredFiles } from "@/lib/delivered-files";
import { TaskBoard } from "@/components/project-workspace/TaskBoard";
import { TaskProgress } from "@/components/project-workspace/TaskProgress";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ProjectWorkspaceRealtime } from "@/components/project-workspace/ProjectWorkspaceRealtime";
import { ProjectTabs } from "@/components/project-workspace/ProjectTabs";
import { ProjectChatTabs } from "@/components/project-workspace/ProjectChatTabs";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getLatestRevisionNote } from "@/lib/revision-notes";

export const metadata = { title: "Project · nexxtt.io", robots: "noindex, nofollow" };

export default async function AgencyProjectDetailPage({ params, searchParams }) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const tab = sp.tab === "tasks" || sp.tab === "chat" ? sp.tab : "overview";
  const chatThread = sp.thread === "admin" ? "admin" : "client";
  const isEmbed = sp.embed === "1";
  const ctx = await resolveAgencyContext();
  if (!ctx.user) redirect("/login");

  // Project + nested job + service in one round-trip.
  const { data: project } = await ctx.supabase
    .from("projects")
    .select(
      `id, job_id, service_id, status, cost_price_cents, retail_price_cents, is_rush, start_date, due_date,
       delivered_at, approved_at, revision_count, created_at, updated_at,
       jobs ( id, job_number, agency_id, client_id ),
       services ( id, name, icon, slug )`
    )
    .eq("id", id)
    .single();
  if (!project) notFound();
  const job = project.jobs;
  const isAdmin = ctx.profile?.role === "admin";
  if (!isAdmin && job?.agency_id !== ctx.agencyId) notFound();

  const [briefRes, filesRes] = await Promise.all([
    ctx.supabase.from("briefs").select("data, submitted_at, updated_at").eq("project_id", project.id).maybeSingle(),
    ctx.supabase
      .from("delivered_files")
      .select("id, name, size_bytes, mime_type, storage_path, uploaded_at")
      .eq("project_id", project.id)
      .order("uploaded_at", { ascending: false }),
  ]);
  const serviceRes = { data: project.services ?? null };
  const signedFiles = await signDeliveredFiles(filesRes.data ?? []);

  // Workspace extras: per-project chat + read-only task board
  const adminClient = createAdminSupabaseClient();
  const [tasksRes, conversationRes, adminConvRes] = await Promise.all([
    adminClient.from("project_tasks").select("*").eq("project_id", project.id).order("sort_order"),
    adminClient.from("conversations").select("id").eq("tier", "project").eq("project_id", project.id).maybeSingle(),
    adminClient.from("conversations").select("id").eq("tier", "project_admin").eq("project_id", project.id).maybeSingle(),
  ]);
  const tasks = tasksRes.data ?? [];
  const conversationId = conversationRes.data?.id ?? null;
  let adminConversationId = adminConvRes.data?.id ?? null;

  // Lazy-create the admin↔agency private thread for agency-owned projects.
  if (!adminConversationId && job?.agency_id) {
    const { data: created } = await adminClient
      .from("conversations")
      .insert({ tier: "project_admin", project_id: project.id, agency_id: job.agency_id })
      .select("id")
      .single();
    adminConversationId = created?.id ?? null;
  }

  const revisionNote = project.status === "revision_requested"
    ? await getLatestRevisionNote(adminClient, project.id)
    : null;
  const activeChatId = chatThread === "admin" ? adminConversationId : conversationId;
  const { data: messages } = activeChatId
    ? await adminClient.from("messages").select("*").eq("conversation_id", activeChatId).order("created_at", { ascending: true }).limit(200)
    : { data: [] };

  return (
    <>
      {!isEmbed && (
        <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
          <AgencyTopbar title={serviceRes.data?.name ?? "Project"} />
        </Suspense>
      )}
      <main id="main-content" className={`flex-1 ${isEmbed ? "pt-1" : ""}`}>
        <ProjectWorkspaceRealtime projectId={project.id} conversationId={activeChatId} />
        {tab === "overview" && (
          <ProjectDetailView
            viewer="agency"
            viewerIsAdmin={ctx.profile?.role === "admin"}
            project={project}
            service={serviceRes.data}
            brief={briefRes.data}
            files={signedFiles}
            job={job}
            backHref="/agency/orders"
            backLabel="Back to orders"
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
              <>
                {job?.agency_id && <ProjectChatTabs variant="agency" />}
                {chatThread === "admin" ? (
                  <ChatPanel
                    conversationId={adminConversationId}
                    initialMessages={messages ?? []}
                    currentUserId={ctx.user.id}
                    placeholder="Message the nexxtt.io super admin about this order…"
                    projectStatus={project.status}
                    variant="wide"
                  />
                ) : (
                  <ChatPanel
                    conversationId={conversationId}
                    initialMessages={messages ?? []}
                    currentUserId={ctx.user.id}
                    placeholder="Message the project team…"
                    projectStatus={project.status}
                    variant="wide"
                  />
                )}
              </>
            )}
          </section>
        )}
      </main>
    </>
  );
}
