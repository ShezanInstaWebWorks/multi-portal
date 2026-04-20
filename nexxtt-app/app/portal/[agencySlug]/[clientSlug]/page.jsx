import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ClientProjectList } from "@/components/client-portal/ClientProjectList";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function ClientPortalHomePage({ params }) {
  const { agencySlug, clientSlug } = await params;

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  // Resolve the client row (layout already did auth/404 checks; duplicate here
  // to avoid prop-drilling).
  const { data: brand } = await admin
    .from("agency_brands")
    .select("agency_id, display_name")
    .eq("portal_slug", agencySlug)
    .maybeSingle();
  if (!brand) notFound();

  const { data: client } = await admin
    .from("clients")
    .select("id, business_name, contact_name, portal_user_id")
    .eq("agency_id", brand.agency_id)
    .eq("portal_slug", clientSlug)
    .maybeSingle();
  if (!client) notFound();

  // Fetch jobs + nested projects via the session (RLS enforced).
  // NOTE: we intentionally exclude cost fields — the client never sees cost or profit.
  //
  // If the viewer is an agency-of-record or admin, the session RLS may not match
  // (they have agency scope, not client scope). Fall back to admin client in that
  // case — the layout has already authorized them.
  const { data: jobsViaSession } = await supabase
    .from("jobs")
    .select(
      `id, job_number, status, is_rush, total_retail_cents, created_at,
       projects ( id, status, retail_price_cents, is_rush, due_date,
                  services ( id, name, icon, slug ) )`
    )
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  let jobs = jobsViaSession ?? [];
  if (jobs.length === 0) {
    // agency preview / admin preview: fall back to service-role fetch (layout
    // already verified their access).
    const { data: jobsViaAdmin } = await admin
      .from("jobs")
      .select(
        `id, job_number, status, is_rush, total_retail_cents, created_at,
         projects ( id, status, retail_price_cents, is_rush, due_date,
                    services ( id, name, icon, slug ) )`
      )
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });
    jobs = jobsViaAdmin ?? [];
  }

  // Greeting uses first name of the client contact, not the viewer's name.
  const firstName = (client.contact_name ?? "").split(/\s+/)[0] || "there";

  return (
    <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
      {/* Hero greeting */}
      <div className="mb-6">
        <div
          className="text-[0.72rem] font-bold uppercase mb-1"
          style={{ letterSpacing: "0.1em", color: "var(--color-muted)" }}
        >
          {brand.display_name}
        </div>
        <h1 className="font-display text-[1.6rem] lg:text-[1.8rem] font-extrabold text-dark tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-[0.88rem] text-muted mt-1 max-w-[600px]">
          Track your projects below. You&apos;ll see progress updates, review
          drafts, and download final files right from here.
        </p>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No projects yet"
          description="Your agency will let you know as soon as work begins. You'll see it here first."
        />
      ) : (
        <ClientProjectList jobs={jobs} basePath={`/portal/${agencySlug}/${clientSlug}`} />
      )}
    </main>
  );
}
