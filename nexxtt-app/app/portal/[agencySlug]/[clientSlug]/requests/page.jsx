import { notFound, redirect } from "next/navigation";
import { resolvePortalContext } from "@/lib/portal-context";
import { RequestForm } from "@/components/project-requests/RequestForm";
import { RequestCard } from "@/components/project-requests/RequestCard";
import { RequestsRealtime } from "@/components/project-requests/RequestsRealtime";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { availableActions } from "@/lib/request-actions";

export const metadata = { title: "Project requests · nexxtt.io", robots: "noindex, nofollow" };

export default async function ClientPortalRequestsPage({ params }) {
  const { agencySlug, clientSlug } = await params;
  const { user, brand, client, profile, admin } = await resolvePortalContext(agencySlug, clientSlug);

  if (!user) redirect("/login");
  if (!brand || !client) notFound();

  const isClientOwner    = client.portal_user_id === user.id;
  const isAgencyOfRecord = profile?.role === "agency" && profile.agency_id === brand.agency_id;
  const isAdmin          = profile?.role === "admin";
  if (!isClientOwner && !isAgencyOfRecord && !isAdmin) redirect("/login");

  const viewerRole = isAdmin ? "admin" : isAgencyOfRecord ? "agency" : "agency_client";

  const [requestsRes, servicesRes, conversationRes] = await Promise.all([
    admin
      .from("project_requests")
      .select("*, services ( id, name, icon )")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    admin.from("services").select("id, name, icon, cost_price_cents, default_retail_cents").eq("is_active", true).order("sort_order"),
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
          {viewerRole === "agency_client" && <RequestForm services={services} />}

          <div className="flex flex-col gap-3">
            {requests.length === 0 ? (
              <div className="text-sm text-muted bg-white border border-border rounded-[12px] p-5 text-center">
                No requests yet — file your first one above.
              </div>
            ) : (
              requests.map((r) => (
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
          </div>
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
