import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { RequestCard } from "@/components/project-requests/RequestCard";
import { RequestForm } from "@/components/project-requests/RequestForm";
import { RequestsRealtime } from "@/components/project-requests/RequestsRealtime";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { availableActions } from "@/lib/request-actions";
import { resolveAgencyContext } from "@/lib/impersonation";

export const metadata = { title: "Project requests · nexxtt.io", robots: "noindex, nofollow" };

export default async function AgencyRequestsPage({ searchParams }) {
  const ctx = await resolveAgencyContext();
  if (!ctx.user) redirect("/login");
  if (!ctx.agencyId) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted text-sm">Agency account required.</p>
      </main>
    );
  }

  const resolved = (await searchParams) ?? {};
  const selectedClientId = typeof resolved.client === "string" ? resolved.client : null;
  const thread = typeof resolved.thread === "string" ? resolved.thread : null; // "admin" → agency↔admin thread

  const [requestsRes, servicesRes, conversationsRes, adminThreadRes] = await Promise.all([
    ctx.supabase
      .from("project_requests")
      .select("*, clients ( id, business_name ), services ( id, name, icon )")
      .eq("agency_id", ctx.agencyId)
      .order("created_at", { ascending: false }),
    ctx.supabase.from("services").select("id, name, icon, cost_price_cents, default_retail_cents").eq("is_active", true).order("sort_order"),
    ctx.supabase
      .from("conversations")
      .select("id, client_id, last_message_at, last_message_preview, clients ( id, business_name )")
      .eq("tier", "agency")
      .eq("agency_id", ctx.agencyId)
      .order("last_message_at", { ascending: false, nullsFirst: false }),
    ctx.supabase
      .from("conversations")
      .select("id, last_message_at, last_message_preview")
      .eq("tier", "agency_admin")
      .eq("agency_id", ctx.agencyId)
      .maybeSingle(),
  ]);

  const requests = requestsRes.data ?? [];
  const services = servicesRes.data ?? [];
  const conversations = conversationsRes.data ?? [];
  let adminThread = adminThreadRes.data ?? null;

  // Lazy-create the agency↔admin thread if the backfill missed this agency.
  if (!adminThread) {
    const { data: created } = await ctx.supabase
      .from("conversations")
      .insert({ tier: "agency_admin", agency_id: ctx.agencyId })
      .select("id, last_message_at, last_message_preview")
      .single();
    adminThread = created ?? null;
  }

  // Pick the conversation to show in the right-hand chat panel
  const isAdminThread = thread === "admin";
  let activeConversation = null;
  if (isAdminThread) {
    activeConversation = adminThread ? { ...adminThread, isAdminThread: true } : null;
  } else if (selectedClientId) {
    activeConversation = conversations.find((c) => c.client_id === selectedClientId) ?? null;
  } else {
    activeConversation = conversations[0] ?? null;
  }

  const { data: messages } = activeConversation
    ? await ctx.supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversation.id)
        .order("created_at", { ascending: true })
        .limit(200)
    : { data: [] };

  // Filter requests to the active client, or show all if admin thread / none selected
  const visibleRequests = (!isAdminThread && activeConversation?.client_id)
    ? requests.filter((r) => r.client_id === activeConversation.client_id)
    : requests;

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title="Project requests" />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1400px] mx-auto w-full">
        <RequestsRealtime />

        <p className="text-sm text-muted mb-5">
          Review and negotiate project requests with your clients, then forward accepted ones to admin to fulfil.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_380px] gap-4 items-start">
          {/* Thread list (left) — admin thread pinned at top, clients below */}
          <aside className="bg-white border border-border rounded-[12px] overflow-hidden">
            <div className="px-3 py-2 text-[0.7rem] font-bold uppercase text-muted border-b border-border" style={{ letterSpacing: "0.1em" }}>
              nexxtt.io
            </div>
            <a
              href="/agency/requests?thread=admin"
              className={`flex items-start gap-2 px-3 py-2.5 border-b border-border text-left text-[0.85rem] ${
                isAdminThread ? "bg-teal-pale text-dark font-semibold" : "text-body hover:bg-off"
              }`}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[0.85rem] shrink-0 mt-0.5"
                style={{ background: "rgba(124,58,237,0.12)", color: "var(--color-adm)", border: "1px solid rgba(124,58,237,0.25)" }}
              >
                🛡
              </span>
              <div className="min-w-0">
                <div className="font-bold truncate">Super admin</div>
                <div className="text-[0.72rem] text-muted truncate">
                  {adminThread?.last_message_preview ?? "Private thread with nexxtt.io"}
                </div>
              </div>
            </a>

            <div className="px-3 py-2 text-[0.7rem] font-bold uppercase text-muted border-b border-border" style={{ letterSpacing: "0.1em" }}>
              Clients
            </div>
            {conversations.length === 0 ? (
              <div className="px-3 py-4 text-[0.82rem] text-muted">No client threads yet.</div>
            ) : (
              <div className="flex flex-col">
                {conversations.map((c) => {
                  const isActive = !isAdminThread && activeConversation?.id === c.id;
                  const name = c.clients?.business_name ?? "—";
                  return (
                    <a
                      key={c.id}
                      href={`/agency/requests?client=${c.client_id}`}
                      className={`px-3 py-2.5 border-b border-border last:border-0 text-left text-[0.85rem] ${
                        isActive ? "bg-teal-pale text-dark font-semibold" : "text-body hover:bg-off"
                      }`}
                    >
                      <div className="font-bold truncate">{name}</div>
                      <div className="text-[0.72rem] text-muted truncate">
                        {c.last_message_preview ?? "No messages yet"}
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Requests (middle) */}
          <div className="flex flex-col gap-3">
            {isAdminThread ? (
              <div
                className="bg-white border border-border rounded-[12px] p-4 text-[0.85rem] text-body"
                style={{ borderLeft: "4px solid var(--color-adm)" }}
              >
                <div className="font-bold text-dark mb-1">Private super-admin thread</div>
                <p className="text-muted leading-relaxed">
                  Coordinate pricing, delivery timelines, and project approvals with nexxtt.io directly. Your clients do not see this conversation.
                </p>
              </div>
            ) : (
              <>
                {activeConversation?.client_id && (
                  <RequestForm
                    services={services}
                    defaultClientId={activeConversation.client_id}
                    compact
                  />
                )}
                {visibleRequests.length === 0 ? (
                  <div className="text-sm text-muted bg-white border border-border rounded-[12px] p-5 text-center">
                    {activeConversation
                      ? `No requests yet from ${activeConversation.clients?.business_name ?? "this client"}.`
                      : "No project requests yet."}
                  </div>
                ) : (
                  visibleRequests.map((r) => (
                    <div key={r.id}>
                      <div className="text-[0.72rem] text-muted mb-1 pl-1">
                        {r.clients?.business_name ?? "—"}
                      </div>
                      <RequestCard
                        request={r}
                        viewerRole="agency"
                        actions={availableActions({ request: r, viewerRole: "agency", viewerUserId: ctx.user.id })}
                        services={services}
                      />
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* Chat (right) */}
          <ChatPanel
            conversationId={activeConversation?.id ?? null}
            initialMessages={messages ?? []}
            currentUserId={ctx.user.id}
            placeholder={
              isAdminThread
                ? "Message the nexxtt.io super admin…"
                : activeConversation
                  ? `Message ${activeConversation.clients?.business_name ?? "client"}…`
                  : "Select a thread to chat…"
            }
          />
        </div>
      </main>
    </>
  );
}
