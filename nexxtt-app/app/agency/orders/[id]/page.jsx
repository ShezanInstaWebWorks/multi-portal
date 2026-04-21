import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCents } from "@/lib/money";
import { ArrowLeft } from "lucide-react";
import { resolveAgencyContext } from "@/lib/impersonation";

export const metadata = {
  title: "Order · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  const ctx = await resolveAgencyContext();
  if (!ctx.user) redirect("/login");

  // Single round-trip: job + client + projects + per-project service via nested selects.
  const { data: job } = await ctx.supabase
    .from("jobs")
    .select(
      `id, job_number, status, is_rush, total_cost_cents, total_retail_cents, created_at, client_id, agency_id,
       clients ( business_name, contact_name, contact_email ),
       projects ( id, status, cost_price_cents, retail_price_cents, is_rush, due_date, service_id,
                  services ( id, name, icon, slug ) )`
    )
    .eq("id", id)
    .single();

  if (!job || (ctx.agencyId && job.agency_id !== ctx.agencyId)) notFound();

  const clientRes = { data: job.clients ?? null };
  const projectsRes = { data: job.projects ?? [] };
  const services = (job.projects ?? []).map((p) => p.services).filter(Boolean);

  const profit = job.total_retail_cents - job.total_cost_cents;

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title={`Order ${job.job_number}`} />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1000px] mx-auto w-full">
        <Link
          href="/agency/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </Link>

        {/* Header card */}
        <div
          className="relative overflow-hidden rounded-[16px] p-6 mb-5 text-white shadow-md"
          style={{
            background: "linear-gradient(135deg,#0B1F3A 0%,#152d52 60%,#0B1F3A 100%)",
          }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div
                className="text-[0.65rem] font-bold uppercase text-white/40 mb-1.5"
                style={{ letterSpacing: "0.12em" }}
              >
                ORDER PLACED
              </div>
              <div className="font-display text-[1.6rem] font-extrabold tracking-tight">
                {job.job_number}
              </div>
              <div className="text-[0.82rem] text-white/60 mt-1">
                {clientRes.data?.business_name ?? "—"} ·{" "}
                {new Date(job.created_at).toLocaleDateString("en-AU", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-[0.65rem] font-bold uppercase text-white/40 mb-1"
                style={{ letterSpacing: "0.12em" }}
              >
                YOUR PROFIT
              </div>
              <div
                className="font-display text-[1.8rem] font-extrabold"
                style={{ color: "var(--color-teal)" }}
              >
                {formatCents(profit)}
              </div>
              <div className="text-[0.72rem] text-white/50 mt-0.5">
                Cost {formatCents(job.total_cost_cents)} · Retail{" "}
                {formatCents(job.total_retail_cents)}
              </div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <h2 className="font-display text-[1.15rem] font-extrabold text-dark mb-3">
          Projects
        </h2>
        <div className="flex flex-col gap-2.5 mb-6">
          {(projectsRes.data ?? []).map((p) => {
            const svc = services.find((s) => s.id === p.service_id);
            return (
              <Link
                key={p.id}
                href={`/agency/projects/${p.id}`}
                className="bg-white rounded-[12px] border border-border p-4 shadow-sm flex items-center gap-3 flex-wrap hover:border-teal hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[1.1rem]"
                  style={{
                    background: "var(--color-teal-pale)",
                    color: "var(--color-teal)",
                  }}
                >
                  {svc?.icon ?? "•"}
                </div>
                <div className="flex-1 min-w-[160px]">
                  <div className="font-bold text-dark">{svc?.name ?? "Project"}</div>
                  <div className="text-[0.78rem] text-muted">
                    Due {p.due_date ?? "—"}
                    {p.is_rush && " · RUSH"}
                  </div>
                </div>
                <StatusBadge status={p.status} />
                <div className="font-display font-extrabold text-green">
                  {formatCents(p.retail_price_cents - p.cost_price_cents)}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-[12px] p-4 bg-teal-pale border border-teal/20 text-sm text-body">
          <strong className="text-dark">What&apos;s next?</strong> Your brief
          has been filed. The design team will pick up each project, and
          you&apos;ll see status changes here in real time.
        </div>
      </main>
    </>
  );
}
