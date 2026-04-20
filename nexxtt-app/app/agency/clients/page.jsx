import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { ClientList } from "@/components/clients/ClientList";
import { EmptyState } from "@/components/shared/EmptyState";
import { resolveAgencyContext } from "@/lib/impersonation";

export const metadata = {
  title: "Clients · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function ClientsPage() {
  const ctx = await resolveAgencyContext();
  if (!ctx.user) redirect("/login");

  if (!ctx.agencyId) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted text-sm">No agency attached to this account.</p>
      </main>
    );
  }

  const [clientsRes, jobsRes] = await Promise.all([
    ctx.supabase
      .from("clients")
      .select(
        "id, business_name, contact_name, contact_email, industry, portal_status, portal_access_level, portal_slug, invite_sent_at, invite_expires_at, portal_activated_at, created_at"
      )
      .eq("agency_id", ctx.agencyId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("jobs")
      .select("id, client_id, total_retail_cents, created_at")
      .eq("agency_id", ctx.agencyId),
  ]);

  const jobsByClient = new Map();
  for (const j of jobsRes.data ?? []) {
    if (!j.client_id) continue;
    const bucket = jobsByClient.get(j.client_id) ?? {
      count: 0,
      billedCents: 0,
      lastAt: null,
    };
    bucket.count += 1;
    bucket.billedCents += j.total_retail_cents ?? 0;
    if (!bucket.lastAt || new Date(j.created_at) > new Date(bucket.lastAt)) {
      bucket.lastAt = j.created_at;
    }
    jobsByClient.set(j.client_id, bucket);
  }

  const clients = (clientsRes.data ?? []).map((c) => ({
    ...c,
    stats: jobsByClient.get(c.id) ?? { count: 0, billedCents: 0, lastAt: null },
  }));

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title="Client Manager" />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
        {clients.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No clients yet"
            description="Invite your first client — they'll get a branded portal where they can see progress and approve deliverables."
            action={
              <Link
                href="/agency/clients/invite"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white"
                style={{
                  background: "var(--color-teal)",
                  boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
                }}
              >
                ✉️ Invite client
              </Link>
            }
          />
        ) : (
          <ClientList clients={clients} />
        )}
      </main>
    </>
  );
}
