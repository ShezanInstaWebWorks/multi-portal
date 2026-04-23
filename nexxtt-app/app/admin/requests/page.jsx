import { redirect } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { RequestCard } from "@/components/project-requests/RequestCard";
import { RequestsRealtime } from "@/components/project-requests/RequestsRealtime";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { availableActions } from "@/lib/request-actions";

export const metadata = { title: "Requests · Admin · nexxtt.io", robots: "noindex, nofollow" };

export default async function AdminRequestsPage({ searchParams }) {
  const userClient = await createServerSupabaseClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/login");

  const resolved = (await searchParams) ?? {};
  const selectedConvId = typeof resolved.conv === "string" ? resolved.conv : null;

  const [requestsRes, servicesRes, directConvsRes, agencyAdminConvsRes] = await Promise.all([
    admin
      .from("project_requests")
      .select("*, clients ( id, business_name ), agencies ( id, name ), services ( id, name, icon )")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("services").select("id, name, icon, cost_price_cents, default_retail_cents").eq("is_active", true).order("sort_order"),
    admin
      .from("conversations")
      .select("id, tier, direct_client_user_id, last_message_at, last_message_preview")
      .eq("tier", "direct")
      .order("last_message_at", { ascending: false, nullsFirst: false }),
    admin
      .from("conversations")
      .select("id, tier, agency_id, last_message_at, last_message_preview, agencies ( id, name )")
      .eq("tier", "agency_admin")
      .order("last_message_at", { ascending: false, nullsFirst: false }),
  ]);

  const requests = requestsRes.data ?? [];
  const services = servicesRes.data ?? [];
  const directConversations = directConvsRes.data ?? [];
  const agencyAdminConversations = agencyAdminConvsRes.data ?? [];

  // Enrich direct convs with user emails so admin sees who they're talking to
  const directUserIds = directConversations.map((c) => c.direct_client_user_id).filter(Boolean);
  let userEmailMap = {};
  if (directUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("id, first_name, last_name")
      .in("id", directUserIds);
    // Also get emails from auth.users via a second lookup
    for (const id of directUserIds) {
      const { data: u } = await admin.auth.admin.getUserById(id);
      userEmailMap[id] = {
        email: u?.user?.email ?? null,
        name: profiles?.find((p) => p.id === id),
      };
    }
  }

  // Active thread — prefer an explicit ?conv= match from either list, else first direct
  const allConvs = [...agencyAdminConversations, ...directConversations];
  const activeConv =
    (selectedConvId && allConvs.find((c) => c.id === selectedConvId)) ||
    directConversations[0] ||
    agencyAdminConversations[0] ||
    null;

  const { data: messages } = activeConv
    ? await admin
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConv.id)
        .order("created_at", { ascending: true })
        .limit(200)
    : { data: [] };

  // Pending actions queue
  const actionable = requests.filter((r) =>
    ["sent_to_admin", "pending_counterparty", "counter_offered", "accepted"].includes(r.status)
  );

  return (
    <>
      <AdminTopbar title="Project requests" />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1400px] mx-auto w-full">
        <RequestsRealtime />

        <p className="text-sm text-muted mb-5">
          All project requests across agencies and direct clients. Convert agency-approved requests to jobs and drive direct-client requests from end to end.
        </p>

        <h2 className="font-display text-[1.05rem] font-extrabold text-dark mb-2">
          Needs attention ({actionable.length})
        </h2>
        <div className="flex flex-col gap-3 mb-8">
          {actionable.length === 0 ? (
            <div className="text-sm text-muted bg-white border border-border rounded-[12px] p-4 text-center">
              No open requests right now.
            </div>
          ) : (
            actionable.map((r) => (
              <div key={r.id}>
                <div className="text-[0.72rem] text-muted mb-1 pl-1">
                  {r.client_id
                    ? `Agency · ${r.agencies?.name ?? ""} → ${r.clients?.business_name ?? ""}`
                    : "Direct"}
                </div>
                <RequestCard
                  request={r}
                  viewerRole="admin"
                  actions={availableActions({ request: r, viewerRole: "admin", viewerUserId: user.id })}
                  services={services}
                />
              </div>
            ))
          )}
        </div>

        <h2 className="font-display text-[1.05rem] font-extrabold text-dark mb-2">
          Chat threads
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
          <aside className="bg-white border border-border rounded-[12px] overflow-hidden">
            <div className="px-3 py-2 text-[0.7rem] font-bold uppercase text-muted border-b border-border" style={{ letterSpacing: "0.1em" }}>
              Agency partners
            </div>
            {agencyAdminConversations.length === 0 ? (
              <div className="px-3 py-3 text-[0.82rem] text-muted">No agencies yet.</div>
            ) : (
              <div className="flex flex-col">
                {agencyAdminConversations.map((c) => {
                  const isActive = activeConv?.id === c.id;
                  const name = c.agencies?.name ?? "Agency";
                  return (
                    <a
                      key={c.id}
                      href={`/admin/requests?conv=${c.id}`}
                      className={`flex items-start gap-2 px-3 py-2.5 border-b border-border text-[0.85rem] ${
                        isActive ? "bg-teal-pale text-dark font-semibold" : "text-body hover:bg-off"
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[0.78rem] shrink-0 mt-0.5"
                        style={{ background: "rgba(0,184,169,0.12)", color: "var(--color-teal)" }}
                      >
                        🏢
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{name}</div>
                        <div className="text-[0.72rem] text-muted truncate">
                          {c.last_message_preview ?? "No messages"}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}

            <div className="px-3 py-2 text-[0.7rem] font-bold uppercase text-muted border-b border-border" style={{ letterSpacing: "0.1em" }}>
              Direct clients
            </div>
            {directConversations.length === 0 ? (
              <div className="px-3 py-3 text-[0.82rem] text-muted">No direct threads yet.</div>
            ) : (
              <div className="flex flex-col">
                {directConversations.map((c) => {
                  const isActive = activeConv?.id === c.id;
                  const meta = userEmailMap[c.direct_client_user_id];
                  const name = meta?.name ? `${meta.name.first_name ?? ""} ${meta.name.last_name ?? ""}`.trim() : null;
                  return (
                    <a
                      key={c.id}
                      href={`/admin/requests?conv=${c.id}`}
                      className={`flex items-start gap-2 px-3 py-2.5 border-b border-border last:border-0 text-[0.85rem] ${
                        isActive ? "bg-teal-pale text-dark font-semibold" : "text-body hover:bg-off"
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[0.78rem] shrink-0 mt-0.5"
                        style={{ background: "rgba(16,185,129,0.12)", color: "var(--color-green)" }}
                      >
                        👤
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{name || meta?.email || "Direct client"}</div>
                        <div className="text-[0.72rem] text-muted truncate">
                          {c.last_message_preview ?? "No messages"}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </aside>

          <ChatPanel
            conversationId={activeConv?.id ?? null}
            initialMessages={messages ?? []}
            currentUserId={user.id}
            placeholder={
              activeConv?.tier === "agency_admin"
                ? `Reply to ${activeConv.agencies?.name ?? "agency"}…`
                : "Reply to the direct client…"
            }
          />
        </div>
      </main>
    </>
  );
}
