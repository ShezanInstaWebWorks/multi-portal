import { notFound, redirect } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { AdminProjectControls } from "@/components/project-workspace/AdminProjectControls";
import { TaskBoard } from "@/components/project-workspace/TaskBoard";
import { TaskProgress } from "@/components/project-workspace/TaskProgress";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ProjectWorkspaceRealtime } from "@/components/project-workspace/ProjectWorkspaceRealtime";
import { ProjectTabs } from "@/components/project-workspace/ProjectTabs";
import { ProjectChatTabs } from "@/components/project-workspace/ProjectChatTabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCents } from "@/lib/money";
import { signDeliveredFiles } from "@/lib/delivered-files";
import { getLatestRevisionNote } from "@/lib/revision-notes";

export const metadata = { title: "Project workspace · Admin · nexxtt.io", robots: "noindex, nofollow" };

export default async function AdminProjectWorkspace({ params, searchParams }) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const tab = sp.tab === "tasks" || sp.tab === "chat" ? sp.tab : "overview";
  const chatThread = sp.thread === "admin" ? "admin" : "client";
  const isEmbed = sp.embed === "1";

  const userClient = await createServerSupabaseClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin.from("user_profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/login");

  const { data: project } = await admin
    .from("projects")
    .select(`
      id, job_id, service_id, status, start_date, due_date, is_rush,
      cost_price_cents, retail_price_cents,
      delivered_at, approved_at, revision_count, created_at, updated_at,
      jobs ( id, job_number, agency_id, client_id, direct_client_user_id,
             clients ( id, business_name ),
             agencies ( id, name ) ),
      services ( id, name, icon, slug )
    `)
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  const [tasksRes, conversationRes, adminConvRes, briefRes, filesRes] = await Promise.all([
    admin.from("project_tasks").select("*").eq("project_id", id).order("sort_order"),
    admin.from("conversations").select("id").eq("tier", "project").eq("project_id", id).maybeSingle(),
    admin.from("conversations").select("id").eq("tier", "project_admin").eq("project_id", id).maybeSingle(),
    admin.from("briefs").select("data, submitted_at, updated_at").eq("project_id", id).maybeSingle(),
    admin
      .from("delivered_files")
      .select("id, name, size_bytes, mime_type, storage_path, uploaded_at")
      .eq("project_id", id)
      .order("uploaded_at", { ascending: false }),
  ]);
  const brief = briefRes.data ?? null;
  const signedFiles = await signDeliveredFiles(filesRes.data ?? []);
  const tasks = tasksRes.data ?? [];
  let conversationId = conversationRes.data?.id ?? null;
  let adminConversationId = adminConvRes.data?.id ?? null;
  const revisionNote = project.status === "revision_requested"
    ? await getLatestRevisionNote(admin, project.id)
    : null;

  // Backfill safety net (also handled by trigger for new projects)
  if (!conversationId) {
    const { data: created } = await admin
      .from("conversations")
      .insert({ tier: "project", project_id: id })
      .select("id")
      .single();
    conversationId = created?.id ?? null;
  }

  // Lazy-create the private admin↔agency thread for agency-owned projects.
  const jobAgencyId = project.jobs?.agency_id ?? null;
  if (!adminConversationId && jobAgencyId) {
    const { data: created } = await admin
      .from("conversations")
      .insert({ tier: "project_admin", project_id: id, agency_id: jobAgencyId })
      .select("id")
      .single();
    adminConversationId = created?.id ?? null;
  }

  const activeChatId = chatThread === "admin" ? adminConversationId : conversationId;
  const { data: messages } = activeChatId
    ? await admin
        .from("messages")
        .select("*")
        .eq("conversation_id", activeChatId)
        .order("created_at", { ascending: true })
        .limit(200)
    : { data: [] };

  const job = project.jobs;
  const audience = job?.client_id
    ? `${job.agencies?.name ?? "Agency"} → ${job.clients?.business_name ?? "Client"}`
    : "Direct client";

  return (
    <>
      {!isEmbed && <AdminTopbar title={project.services?.name ?? "Project"} />}
      <main className={`flex-1 pb-16 ${isEmbed ? "pt-1" : ""}`}>
        <ProjectWorkspaceRealtime projectId={id} conversationId={activeChatId} />

        {tab === "overview" && (
          <>
            <ProjectDetailView
              viewer="agency"
              viewerIsAdmin={true}
              project={project}
              service={project.services ?? null}
              brief={brief}
              files={signedFiles}
              job={job}
              backHref="/admin/orders"
              backLabel="Back to orders"
              revisionNote={revisionNote}
              tabsSlot={
                <div className="mb-3 flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[0.7rem] font-bold"
                    style={{
                      background: "rgba(124,58,237,0.1)",
                      color: "var(--color-adm)",
                      border: "1px solid rgba(124,58,237,0.3)",
                    }}
                  >
                    🛡 Super Admin
                  </span>
                  <span className="text-[0.78rem] text-muted">{audience}</span>
                  <ProjectTabs />
                </div>
              }
            />
            <section className="px-4 sm:px-6 lg:px-8 max-w-[1100px] mx-auto w-full">
              <AdminProjectControls project={project} />
            </section>
          </>
        )}

        {tab !== "overview" && (
          <section className="px-4 sm:px-6 lg:px-8 pt-5 lg:pt-7 max-w-[1400px] mx-auto w-full">
            <ProjectTabs />
            {tab === "tasks" && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <h2 className="font-display text-[1rem] font-extrabold text-dark">Tasks</h2>
                  <TaskProgress tasks={tasks} />
                </div>
                <TaskBoard projectId={project.id} tasks={tasks} canEdit={true} />
              </div>
            )}
            {tab === "chat" && (
              <>
                {jobAgencyId && <ProjectChatTabs variant="admin" />}
                {chatThread === "admin" ? (
                  <ChatPanel
                    conversationId={adminConversationId}
                    initialMessages={messages ?? []}
                    currentUserId={user.id}
                    placeholder={`Message ${project.jobs?.agencies?.name ?? "the agency"} privately…`}
                    projectStatus={project.status}
                    variant="wide"
                  />
                ) : (
                  <ChatPanel
                    conversationId={conversationId}
                    initialMessages={messages ?? []}
                    currentUserId={user.id}
                    placeholder="Observer view — only agency and client can post here"
                    projectStatus={project.status}
                    variant="wide"
                    readOnly
                    readOnlyLabel="Admin observer view · only the agency and client reply here. Use the private thread for coordination with the agency."
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
