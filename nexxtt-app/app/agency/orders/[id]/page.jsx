import { redirect } from "next/navigation";
import { resolveAgencyContext } from "@/lib/impersonation";

// The per-order detail view was replaced by per-project overviews. Any link
// that still points here (email notifications, search results, new-order
// wizard, request→job conversion) jumps straight to the first project, or
// falls back to the orders list if the job has no projects.
export default async function OrderRedirect({ params }) {
  const { id } = await params;
  const ctx = await resolveAgencyContext();
  if (!ctx.user) redirect("/login");

  const { data: job } = await ctx.supabase
    .from("jobs")
    .select("id, agency_id, projects ( id )")
    .eq("id", id)
    .maybeSingle();

  if (!job) redirect("/agency/orders");

  const isAdmin = ctx.profile?.role === "admin";
  if (!isAdmin && job.agency_id !== ctx.agencyId) redirect("/agency/orders");

  const firstProjectId = job.projects?.[0]?.id ?? null;
  redirect(firstProjectId ? `/agency/projects/${firstProjectId}` : "/agency/orders");
}
