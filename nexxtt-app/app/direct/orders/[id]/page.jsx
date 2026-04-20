import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DirectTopbar } from "@/components/layout/DirectTopbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCents } from "@/lib/money";

export const metadata = { title: "Order · nexxtt.io", robots: "noindex, nofollow" };

export default async function DirectOrderDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: job } = await supabase
    .from("jobs")
    .select(
      `id, job_number, status, is_rush, total_retail_cents, created_at, direct_client_user_id,
       projects ( id, status, retail_price_cents, is_rush, due_date, delivered_at,
                  services ( name, icon, slug ) )`
    )
    .eq("id", id)
    .single();

  if (!job || job.direct_client_user_id !== user.id) notFound();

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <DirectTopbar title={`Order ${job.job_number}`} />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1000px] mx-auto w-full">
        <Link
          href="/direct/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to orders
        </Link>

        {/* Header */}
        <div
          className="relative overflow-hidden rounded-[16px] p-6 mb-5 text-white shadow-md"
          style={{
            background:
              "linear-gradient(135deg, var(--color-navy) 0%, #152d52 60%, var(--color-navy) 100%)",
          }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div
                className="text-[0.65rem] font-bold uppercase text-white/40 mb-1.5"
                style={{ letterSpacing: "0.12em" }}
              >
                ORDER
              </div>
              <div className="font-display text-[1.6rem] font-extrabold tracking-tight">
                {job.job_number}
              </div>
              <div className="text-[0.82rem] text-white/60 mt-1">
                {new Date(job.created_at).toLocaleDateString("en-AU", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
                {" · "}
                <StatusBadge status={job.status} />
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-[0.65rem] font-bold uppercase text-white/40 mb-1"
                style={{ letterSpacing: "0.12em" }}
              >
                TOTAL
              </div>
              <div
                className="font-display text-[1.8rem] font-extrabold"
                style={{ color: "var(--color-teal)" }}
              >
                {formatCents(job.total_retail_cents)}
              </div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <h2 className="font-display text-[1.15rem] font-extrabold text-dark mb-3">
          Projects
        </h2>
        <div className="flex flex-col gap-2.5">
          {(job.projects ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/direct/projects/${p.id}`}
              className="bg-white rounded-[12px] border border-border p-4 shadow-sm flex items-center gap-3 flex-wrap hover:border-teal hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[1.1rem]"
                style={{
                  background: "var(--color-teal-pale)",
                  color: "var(--color-teal)",
                }}
              >
                {p.services?.icon ?? "•"}
              </div>
              <div className="flex-1 min-w-[160px]">
                <div className="font-bold text-dark">{p.services?.name ?? "Project"}</div>
                <div className="text-[0.78rem] text-muted">
                  Due {p.due_date ?? "—"}
                  {p.is_rush && " · RUSH"}
                </div>
              </div>
              <StatusBadge status={p.status} />
              <div className="font-display font-extrabold text-dark">
                {formatCents(p.retail_price_cents)}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-5 rounded-[12px] p-4 bg-teal-pale border border-teal/20 text-sm text-body">
          <strong className="text-dark">What&apos;s next?</strong> Our design team
          will keep you posted here as each project progresses. Projects marked
          &ldquo;Your review&rdquo; need a quick sign-off from you to move forward.
        </div>
      </main>
    </>
  );
}
