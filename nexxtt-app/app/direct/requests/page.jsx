import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { RequestForm } from "@/components/project-requests/RequestForm";
import { RequestCard } from "@/components/project-requests/RequestCard";
import { RequestsRealtime } from "@/components/project-requests/RequestsRealtime";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { availableActions } from "@/lib/request-actions";

export const metadata = { title: "Project requests · nexxtt.io", robots: "noindex, nofollow" };

export default async function DirectRequestsPage() {
  const userClient = await createServerSupabaseClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "direct_client") redirect("/login");

  const [requestsRes, servicesRes, conversationRes] = await Promise.all([
    admin
      .from("project_requests")
      .select("*, services ( id, name, icon )")
      .eq("direct_client_user_id", user.id)
      .order("created_at", { ascending: false }),
    admin.from("services").select("id, name, icon, cost_price_cents, default_retail_cents").eq("is_active", true).order("sort_order"),
    admin
      .from("conversations")
      .select("id")
      .eq("tier", "direct")
      .eq("direct_client_user_id", user.id)
      .maybeSingle(),
  ]);

  const requests = requestsRes.data ?? [];
  const services = servicesRes.data ?? [];
  let conversationId = conversationRes.data?.id ?? null;

  // Lazy-create the thread so chat works before the first request.
  if (!conversationId) {
    const { data: created } = await admin
      .from("conversations")
      .insert({ tier: "direct", direct_client_user_id: user.id })
      .select("id")
      .single();
    conversationId = created?.id ?? null;
  }

  const { data: messages } = conversationId
    ? await admin
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200)
    : { data: [] };

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1200px] mx-auto w-full">
      <RequestsRealtime />

      <h1 className="font-display text-[1.4rem] font-extrabold text-dark mb-1">
        Project requests
      </h1>
      <p className="text-sm text-muted mb-5">
        Submit a new project, accept what admin proposes, and chat live with the nexxtt.io team.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
        <div className="flex flex-col gap-4">
          <RequestForm services={services} />

          <div className="flex flex-col gap-3">
            {requests.length === 0 ? (
              <div className="text-sm text-muted bg-white border border-border rounded-[12px] p-5 text-center">
                No requests yet — submit your first one above, or discuss in chat first.
              </div>
            ) : (
              requests.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  viewerRole="direct_client"
                  actions={availableActions({ request: r, viewerRole: "direct_client", viewerUserId: user.id })}
                  services={services}
                />
              ))
            )}
          </div>
        </div>

        <ChatPanel
          conversationId={conversationId}
          initialMessages={messages ?? []}
          currentUserId={user.id}
          placeholder="Message the nexxtt.io team…"
        />
      </div>
    </main>
  );
}
