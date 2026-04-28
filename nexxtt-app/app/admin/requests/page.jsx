import { redirect } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { RequestCard } from "@/components/project-requests/RequestCard";
import { RequestsRealtime } from "@/components/project-requests/RequestsRealtime";
import { AdminNewDirectRequestPanel } from "@/components/project-requests/AdminNewDirectRequestPanel";
import { AdminWalletAdjustPanel } from "@/components/wallet/AdminWalletAdjustPanel";
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
  const selectedTab = typeof resolved.tab === "string" ? resolved.tab : "attention";
  // Top-level view switcher: "requests" = the cards + status tabs,
  // "chat" = the threads sidebar + message panel. Defaults to requests.
  const selectedView = resolved.view === "chat" ? "chat" : "requests";

  const [requestsRes, servicesRes, packagesRes, directConvsRes, agencyAdminConvsRes] = await Promise.all([
    admin
      .from("project_requests")
      .select("*, clients ( id, business_name ), agencies ( id, name ), services ( id, name, icon )")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("services").select("id, name, icon, slug, cost_price_cents, default_retail_cents, sla_days, rush_sla_days").eq("is_active", true).order("sort_order"),
    admin.from("service_packages").select("id, service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order").eq("is_active", true).order("sort_order"),
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
  const packages = packagesRes.data ?? [];
  const directConversations = directConvsRes.data ?? [];
  const agencyAdminConversations = agencyAdminConvsRes.data ?? [];

  // Direct-client roster for the "Admin initiates request" panel.
  const { data: directProfiles } = await admin
    .from("user_profiles")
    .select("id, first_name, last_name")
    .eq("role", "direct_client")
    .order("first_name", { ascending: true, nullsFirst: false });
  const directClientList = await Promise.all(
    (directProfiles ?? []).map(async (p) => {
      const { data: u } = await admin.auth.admin.getUserById(p.id);
      const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
      const email = u?.user?.email ?? "";
      const label = name && email ? `${name} · ${email}` : (name || email || p.id.slice(0, 8));
      return { id: p.id, label };
    })
  );

  // Combined wallet-owner list for the AdminWalletAdjustPanel: every agency
  // client (with a portal user) + every direct client. Filtering out clients
  // without `portal_user_id` because those have no logged-in client to spend
  // a wallet — crediting them would orphan funds.
  const { data: agencyClients } = await admin
    .from("clients")
    .select("id, business_name, portal_user_id, agencies ( name )")
    .not("portal_user_id", "is", null)
    .order("business_name", { ascending: true });

  // Look up each portal user's email + current balance so admin can
  // unambiguously pick the right one.
  const agencyClientLabels = await Promise.all(
    (agencyClients ?? []).map(async (c) => {
      const [{ data: u }, balanceRes] = await Promise.all([
        admin.auth.admin.getUserById(c.portal_user_id),
        admin.from("wallet_transactions").select("amount_cents").eq("client_id", c.id),
      ]);
      const email = u?.user?.email ?? "no-email";
      const cents = (balanceRes.data ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0);
      const balance = `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return {
        value: `client:${c.id}`,
        label: `🏢 ${c.business_name ?? "—"}${c.agencies?.name ? ` · ${c.agencies.name}` : ""} · ${email} · bal ${balance}`,
      };
    })
  );

  const directClientWithBalance = await Promise.all(
    directClientList.map(async (d) => {
      const balanceRes = await admin
        .from("wallet_transactions")
        .select("amount_cents")
        .eq("direct_client_user_id", d.id);
      const cents = (balanceRes.data ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0);
      const balance = `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return {
        value: `direct:${d.id}`,
        label: `🧑‍💼 ${d.label} · bal ${balance}`,
      };
    })
  );

  const walletOwners = [...agencyClientLabels, ...directClientWithBalance];

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

  // Bucket requests by status so admin can drill in by what they need to do.
  const STATUS_BUCKETS = {
    attention: new Set(["sent_to_admin", "pending_counterparty", "counter_offered", "accepted"]),
    approval:  new Set(["pending_admin_approval"]),
    converted: new Set(["converted"]),
    closed:    new Set(["rejected", "cancelled"]),
  };
  const counts = {
    all:       requests.length,
    attention: requests.filter((r) => STATUS_BUCKETS.attention.has(r.status)).length,
    approval:  requests.filter((r) => STATUS_BUCKETS.approval.has(r.status)).length,
    converted: requests.filter((r) => STATUS_BUCKETS.converted.has(r.status)).length,
    closed:    requests.filter((r) => STATUS_BUCKETS.closed.has(r.status)).length,
  };
  const tabKey = ["all","attention","approval","converted","closed"].includes(selectedTab) ? selectedTab : "attention";
  const visibleRequests = tabKey === "all"
    ? requests
    : requests.filter((r) => STATUS_BUCKETS[tabKey].has(r.status));

  return (
    <>
      <AdminTopbar title="Project requests" />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1400px] mx-auto w-full">
        <RequestsRealtime />

        <p className="text-sm text-muted mb-5">
          All project requests across agencies and direct clients. Convert agency-approved requests to jobs and drive direct-client requests from end to end.
        </p>

        {/* Top-level view switcher: Requests vs Chat */}
        <div className="flex gap-1 p-1 rounded-[12px] bg-off border border-border self-start mb-5 w-max">
          <a
            href={`/admin/requests?view=requests&tab=${tabKey}`}
            className={`px-4 py-1.5 rounded-[10px] text-[0.85rem] font-semibold transition-colors ${
              selectedView === "requests"
                ? "bg-white text-dark shadow-[0_1px_3px_rgba(11,31,58,0.12)]"
                : "text-muted hover:text-dark"
            }`}
          >
            📋 Requests
            <span className={`ml-1.5 ${selectedView === "requests" ? "opacity-70" : "opacity-50"}`}>
              ({counts.attention + counts.approval})
            </span>
          </a>
          <a
            href={`/admin/requests?view=chat${selectedConvId ? `&conv=${selectedConvId}` : ""}`}
            className={`px-4 py-1.5 rounded-[10px] text-[0.85rem] font-semibold transition-colors ${
              selectedView === "chat"
                ? "bg-white text-dark shadow-[0_1px_3px_rgba(11,31,58,0.12)]"
                : "text-muted hover:text-dark"
            }`}
          >
            💬 Chat
            <span className={`ml-1.5 ${selectedView === "chat" ? "opacity-70" : "opacity-50"}`}>
              ({agencyAdminConversations.length + directConversations.length})
            </span>
          </a>
        </div>

        {selectedView === "requests" ? (
          <>
            <div className="mb-5 flex flex-col gap-3">
              <AdminNewDirectRequestPanel
                directClients={directClientList}
                services={services}
                packages={packages}
              />
              <AdminWalletAdjustPanel wallets={walletOwners} />
            </div>

            <h2 className="font-display text-[1.05rem] font-extrabold text-dark mb-2">
              Project requests
            </h2>
            <div className="flex gap-2 mb-3 flex-wrap">
              {[
                { key: "attention", label: "Needs attention" },
                { key: "approval",  label: "Awaiting your approval" },
                { key: "converted", label: "Converted to job" },
                { key: "closed",    label: "Closed" },
                { key: "all",       label: "All" },
              ].map((t) => {
                const active = tabKey === t.key;
                const conv = (cv) => cv > 0 ? cv : 0;
                return (
                  <a
                    key={t.key}
                    href={`/admin/requests?view=requests&tab=${t.key}`}
                    className={`px-3.5 py-1.5 rounded-full text-[0.78rem] font-semibold border transition-colors ${
                      active
                        ? "bg-teal text-white border-teal shadow-[0_2px_8px_rgba(0,184,169,0.25)]"
                        : "bg-white text-muted border-border hover:border-teal hover:text-teal"
                    }`}
                  >
                    {t.label}
                    <span className={`ml-1.5 ${active ? "opacity-80" : "opacity-60"}`}>
                      ({conv(counts[t.key])})
                    </span>
                  </a>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 mb-8">
              {visibleRequests.length === 0 ? (
                <div className="text-sm text-muted bg-white border border-border rounded-[12px] p-4 text-center">
                  {tabKey === "approval"
                    ? "Nothing waiting for your approval."
                    : tabKey === "converted"
                      ? "No converted jobs yet."
                      : tabKey === "closed"
                        ? "No closed requests."
                        : "No open requests right now."}
                </div>
              ) : (
                visibleRequests.map((r) => (
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
          </>
        ) : (
        <>
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
                      href={`/admin/requests?view=chat&conv=${c.id}`}
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
                      href={`/admin/requests?view=chat&conv=${c.id}`}
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
        </>
        )}
      </main>
    </>
  );
}
