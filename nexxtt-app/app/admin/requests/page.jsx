import { redirect } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/chat/ChatPanel";

export const metadata = { title: "Chat · Admin · nexxtt.io", robots: "noindex, nofollow" };

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

  const [directConvsRes, directClientsRes] = await Promise.all([
    admin
      .from("conversations")
      .select("id, tier, direct_client_user_id, last_message_at, last_message_preview")
      .eq("tier", "direct")
      .order("last_message_at", { ascending: false, nullsFirst: false }),
    admin
      .from("user_profiles")
      .select("id, first_name, last_name")
      .eq("role", "direct_client")
      .order("first_name", { ascending: true, nullsFirst: false }),
  ]);

  const directConversations = directConvsRes.data ?? [];
  const directClients = directClientsRes.data ?? [];

  // Ensure every direct client has a conversation thread
  const existingDirectUserIds = new Set(directConversations.map((c) => c.direct_client_user_id));
  for (const client of directClients) {
    if (!existingDirectUserIds.has(client.id)) {
      const { data: created } = await admin
        .from("conversations")
        .insert({ tier: "direct", direct_client_user_id: client.id })
        .select("id, tier, direct_client_user_id, last_message_at, last_message_preview")
        .single();
      if (created) directConversations.push(created);
    }
  }

  // Sort by last_message_at descending (nulls last)
  directConversations.sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return 0;
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return new Date(b.last_message_at) - new Date(a.last_message_at);
  });

  // Enrich direct clients with emails
  let userEmailMap = {};
  for (const client of directClients) {
    const { data: u } = await admin.auth.admin.getUserById(client.id);
    userEmailMap[client.id] = {
      email: u?.user?.email ?? null,
      name: client,
    };
  }

  // Active thread — prefer an explicit ?conv= match, else first direct
  const activeConv =
    (selectedConvId && directConversations.find((c) => c.id === selectedConvId)) ||
    directConversations[0] ||
    null;

  const { data: messages } = activeConv
    ? await admin
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConv.id)
        .order("created_at", { ascending: true })
        .limit(200)
    : { data: [] };

  return (
    <>
      <AdminTopbar title="Chat" />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1400px] mx-auto w-full">
        <h2 className="font-display text-[1.05rem] font-extrabold text-dark mb-2">
          Chat threads
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
          <aside className="bg-white border border-border rounded-[12px] overflow-hidden">
            <div className="px-3 py-2 text-[0.7rem] font-bold uppercase text-muted border-b border-border" style={{ letterSpacing: "0.1em" }}>
              Direct clients
            </div>
            {directClients.length === 0 ? (
              <div className="px-3 py-3 text-[0.82rem] text-muted">No direct clients yet.</div>
            ) : (
              <div className="flex flex-col">
                {directClients.map((c) => {
                  const conv = directConversations.find((d) => d.direct_client_user_id === c.id);
                  const isActive = activeConv?.id === conv?.id;
                  const meta = userEmailMap[c.id];
                  const name = meta?.name ? `${meta.name.first_name ?? ""} ${meta.name.last_name ?? ""}`.trim() : null;
                  return (
                    <a
                      key={c.id}
                      href={`/admin/requests?conv=${conv?.id ?? ""}`}
                      className={`flex items-start gap-2 px-3 py-2.5 border-b border-border last:border-0 text-[0.85rem] ${
                        isActive ? "bg-teal-pale text-dark font-semibold" : "text-body hover:bg-off"
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[0.78rem] shrink-0 mt-0.5"
                        style={{ background: "rgba(16,185,129,0.12)", color: "var(--color-green)" }}
                      >
                        
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{name || meta?.email || "Direct client"}</div>
                        <div className="text-[0.72rem] text-muted truncate">
                          {conv?.last_message_preview ?? "No messages yet"}
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
            placeholder="Reply to the direct client…"
          />
        </div>
      </main>
    </>
  );
}
