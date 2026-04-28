import { notFound, redirect } from "next/navigation";
import { resolvePortalContext } from "@/lib/portal-context";
import { RequestForm } from "@/components/project-requests/RequestForm";
import { RequestCard } from "@/components/project-requests/RequestCard";
import { RequestsRealtime } from "@/components/project-requests/RequestsRealtime";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { availableActions } from "@/lib/request-actions";

export const metadata = { title: "Project requests · nexxtt.io", robots: "noindex, nofollow" };

export default async function ClientPortalRequestsPage({ params, searchParams }) {
  const { agencySlug, clientSlug } = await params;
  const sp = (await searchParams) ?? {};
  const selectedView = sp.view === "compose" ? "compose" : "list";
  const selectedTab = typeof sp.tab === "string" ? sp.tab : "active";
  const { user, brand, client, profile, admin } = await resolvePortalContext(agencySlug, clientSlug);

  if (!user) redirect("/login");
  if (!brand || !client) notFound();

  const isClientOwner    = client.portal_user_id === user.id;
  const isAgencyOfRecord = profile?.role === "agency" && profile.agency_id === brand.agency_id;
  const isAdmin          = profile?.role === "admin";
  if (!isClientOwner && !isAgencyOfRecord && !isAdmin) redirect("/login");

  const viewerRole = isAdmin ? "admin" : isAgencyOfRecord ? "agency" : "agency_client";

  const [requestsRes, servicesRes, packagesRes, conversationRes] = await Promise.all([
    admin
      .from("project_requests")
      .select("*, services ( id, name, icon )")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    admin.from("services").select("id, name, icon, slug, cost_price_cents, default_retail_cents, sla_days, rush_sla_days").eq("is_active", true).order("sort_order"),
    admin.from("service_packages").select("id, service_id, tier, name, description, cost_cents, retail_cents, features, delivery_days, is_popular, sort_order").eq("is_active", true).order("sort_order"),
    admin
      .from("conversations")
      .select("id")
      .eq("tier", "agency")
      .eq("agency_id", brand.agency_id)
      .eq("client_id", client.id)
      .maybeSingle(),
  ]);
  const requests = requestsRes.data ?? [];
  const services = servicesRes.data ?? [];
  const packages = packagesRes.data ?? [];
  let conversationId = conversationRes.data?.id ?? null;

  // Lazy-create the thread so chat works even before the first request is filed.
  if (!conversationId) {
    const { data: created } = await admin
      .from("conversations")
      .insert({ tier: "agency", agency_id: brand.agency_id, client_id: client.id })
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

  // Bucket requests by status for the sub-tabs in the list view.
  const STATUS_BUCKETS = {
    awaiting_agency: new Set(["pending_agency_review"]),
    active:    new Set(["pending_counterparty", "counter_offered", "accepted", "sent_to_admin", "pending_admin_approval"]),
    converted: new Set(["converted"]),
    closed:    new Set(["rejected", "rejected_by_agency", "cancelled"]),
  };
  const counts = {
    all:        requests.length,
    awaiting_agency: requests.filter((r) => STATUS_BUCKETS.awaiting_agency.has(r.status)).length,
    active:    requests.filter((r) => STATUS_BUCKETS.active.has(r.status)).length,
    converted: requests.filter((r) => STATUS_BUCKETS.converted.has(r.status)).length,
    closed:    requests.filter((r) => STATUS_BUCKETS.closed.has(r.status)).length,
  };
  const tabKey = ["all", "awaiting_agency", "active", "converted", "closed"].includes(selectedTab) ? selectedTab : "awaiting_agency";
  const visibleRequests = tabKey === "all"
    ? requests
    : requests.filter((r) => STATUS_BUCKETS[tabKey].has(r.status));

  const basePath = `/portal/${agencySlug}/${clientSlug}/requests`;
  const viewHref = (view) => {
    const params = new URLSearchParams();
    params.set("view", view);
    if (view === "list") params.set("tab", tabKey);
    return `${basePath}?${params.toString()}`;
  };
  const tabHref = (key) => `${basePath}?view=list&tab=${key}`;
  const canCompose = viewerRole === "agency_client";

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1100px] mx-auto w-full">
      <RequestsRealtime />

      <h1 className="font-display text-[1.4rem] font-extrabold text-dark mb-1">
        Project requests
      </h1>
      <p className="text-sm text-muted mb-5">
        File a new project, review what {brand.display_name ?? "your agency"} has proposed, and chat live.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
        <div className="flex flex-col gap-4">
          {/* Top-level switcher: Compose vs Manage. Hidden for read-only viewers. */}
          {canCompose && (
            <div className="flex gap-1 p-1 rounded-[12px] bg-off border border-border self-start">
              <a
                href={viewHref("compose")}
                className={`px-4 py-1.5 rounded-[10px] text-[0.85rem] font-semibold transition-colors ${
                  selectedView === "compose"
                    ? "bg-white text-dark shadow-[0_1px_3px_rgba(11,31,58,0.12)]"
                    : "text-muted hover:text-dark"
                }`}
              >
                + New request
              </a>
              <a
                href={viewHref("list")}
                className={`px-4 py-1.5 rounded-[10px] text-[0.85rem] font-semibold transition-colors ${
                  selectedView === "list"
                    ? "bg-white text-dark shadow-[0_1px_3px_rgba(11,31,58,0.12)]"
                    : "text-muted hover:text-dark"
                }`}
              >
                Requests
                <span className={`ml-1.5 ${selectedView === "list" ? "opacity-70" : "opacity-50"}`}>
                  ({counts.all})
                </span>
              </a>
            </div>
          )}

          {canCompose && selectedView === "compose" ? (
            <RequestForm services={services} packages={packages} showCost={false} />
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "awaiting_agency", label: "Awaiting Agency" },
                  { key: "active",         label: "Active" },
                  { key: "converted",      label: "Converted to job" },
                  { key: "closed",         label: "Closed" },
                  { key: "all",            label: "All" },
                ].map((t) => {
                  const active = tabKey === t.key;
                  return (
                    <a
                      key={t.key}
                      href={tabHref(t.key)}
                      className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold border transition-colors ${
                        active
                          ? "bg-teal text-white border-teal shadow-[0_2px_8px_rgba(0,184,169,0.25)]"
                          : "bg-white text-muted border-border hover:border-teal hover:text-teal"
                      }`}
                    >
                      {t.label}
                      <span className={`ml-1.5 ${active ? "opacity-80" : "opacity-60"}`}>
                        ({counts[t.key] ?? 0})
                      </span>
                    </a>
                  );
                })}
              </div>

              {visibleRequests.length === 0 ? (
                <div className="text-sm text-muted bg-white border border-border rounded-[12px] p-5 text-center">
                  {tabKey === "converted"
                    ? "No converted jobs yet."
                    : tabKey === "closed"
                      ? "No closed requests."
                      : canCompose
                        ? "No requests yet — switch to “New request” to file your first one."
                        : "No requests yet."}
                </div>
              ) : (
                visibleRequests.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    viewerRole={viewerRole}
                    actions={availableActions({ request: r, viewerRole, viewerUserId: user.id })}
                    services={services}
                    portalProjectBaseHref={`/portal/${agencySlug}/${clientSlug}/projects`}
                  />
                ))
              )}
            </>
          )}
        </div>

        <ChatPanel
          conversationId={conversationId}
          initialMessages={messages ?? []}
          currentUserId={user.id}
          placeholder={`Message ${brand.display_name ?? "your agency"}…`}
        />
      </div>
    </main>
  );
}
