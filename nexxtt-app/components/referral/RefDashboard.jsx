"use client";

import { useMemo, useState } from "react";
import { Copy, Mail, Share2 } from "lucide-react";
import { formatCents } from "@/lib/money";

export function RefDashboard({ partner, referrals, commissions, referredById, referralUrl }) {
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const earnedThisMonth = commissions
      .filter((c) => c.period_month === thisMonth)
      .reduce((a, c) => a + c.commission_cents, 0);
    const active = referrals.filter((r) => r.is_active).length;

    // Projected next 12 months based on most recent month's commissions × 12.
    const mostRecentMonth = commissions[0]?.period_month;
    const mostRecentSum = commissions
      .filter((c) => c.period_month === mostRecentMonth)
      .reduce((a, c) => a + c.commission_cents, 0);
    const projectedYear = mostRecentSum * 12;

    return {
      totalEarned: partner.total_earned_cents,
      thisMonth: earnedThisMonth,
      active,
      projected: projectedYear,
      pending: partner.pending_payout_cents,
    };
  }, [partner, referrals, commissions]);

  // Group commission entries per referral → show total and most recent activity.
  const streams = useMemo(() => {
    return referrals.map((r) => {
      const ref = referredById[r.referred_user_id];
      const entries = commissions.filter((c) => c.referral_id === r.id);
      const lifetime = entries.reduce((a, c) => a + c.commission_cents, 0);
      const lastEntry = entries[0];
      return {
        id: r.id,
        business_name: ref?.business_name ?? "Pending activation",
        contact_name: ref
          ? `${ref.first_name ?? ""} ${ref.last_name ?? ""}`.trim()
          : "—",
        role: ref?.role ?? null,
        referred_at: r.referred_at,
        expires_at: r.commission_expires_at,
        entries,
        lifetime,
        lastEntry,
      };
    });
  }, [referrals, commissions, referredById]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked in preview iframes etc. */ }
  }

  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden px-5 lg:px-8 py-7"
        style={{
          background: "linear-gradient(135deg, var(--color-navy) 0%, #0f2d50 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 500, height: 500,
            top: -200, right: -100,
            background: "rgba(0,184,169,0.05)",
          }}
        />
        <div className="relative max-w-[1100px] mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-[1.4rem] font-extrabold text-white tracking-tight mb-1">
                Your Referral Dashboard
              </h1>
              <p className="text-[0.82rem] text-white/40">
                {partner.business_name} · Earn {Math.round((partner.commission_pct ?? 0.2) * 100)}% of every service for {partner.commission_duration_months ?? 12} months per client
              </p>
            </div>
          </div>

          {/* Stat row */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 overflow-hidden mt-5 rounded-[22px]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <HeroStat label="Total earned"       value={formatCents(stats.totalEarned)} valueClass="text-teal" sub={`joined ${new Date(partner.joined_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`} />
            <HeroStat label="This month"         value={formatCents(stats.thisMonth)}   sub="pending next payout" />
            <HeroStat label="Active clients"     value={stats.active.toString()}         sub={`${stats.active === 1 ? "stream" : "streams"} running`} />
            <HeroStat label="Projected 12 mo"    value={formatCents(stats.projected)}   valueClass="text-amber" sub="based on active streams" />
            <HeroStat label="Pending payout"     value={formatCents(stats.pending)}     sub="clears next cycle" />
          </div>

          {/* Referral link share */}
          <div
            className="mt-5 rounded-[22px] overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              className="px-5 py-3 text-[0.78rem] font-semibold text-white/80"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              🔗 Your referral link
            </div>
            <div className="px-5 py-5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <div
                  className="text-[0.68rem] font-bold uppercase text-white/30 mb-1.5"
                  style={{ letterSpacing: "0.1em" }}
                >
                  Share this URL
                </div>
                <input
                  readOnly
                  value={referralUrl}
                  className="w-full rounded-[10px] px-3.5 py-2.5 font-mono text-[0.85rem] text-white/80 outline-none"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(0,184,169,0.2)",
                  }}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[0.78rem] font-bold"
                  style={{
                    background: "var(--color-teal)",
                    color: "var(--color-navy)",
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? "Copied" : "Copy Link"}
                </button>
                <ShareButton
                  href={`mailto:?subject=Check out nexxtt.io&body=I've been using nexxtt.io for design work — worth a look: ${referralUrl}`}
                  icon={<Mail className="w-3.5 h-3.5" />}
                  label="Email"
                />
                <ShareButton
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://" + referralUrl)}`}
                  icon={<Share2 className="w-3.5 h-3.5" />}
                  label="LinkedIn"
                />
              </div>
            </div>
            <div className="px-5 pb-4 text-[0.72rem] text-white/20">
              Anyone who uses this link and places an order is attributed to you
              for {partner.commission_duration_months ?? 12} months.
              Your referral code:{" "}
              <strong className="text-white/50">{partner.referral_code}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="flex-1 px-5 lg:px-8 py-6 max-w-[1100px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
          {/* Active referrals table */}
          <div className="bg-white rounded-[22px] border border-border shadow-sm overflow-hidden">
            <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
              <h2 className="font-display text-[0.95rem] font-extrabold text-dark">
                Active Referrals
              </h2>
              <span className="text-[0.72rem] text-muted">
                {streams.length} {streams.length === 1 ? "client" : "clients"} · commissions running
              </span>
            </header>

            {streams.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                No referrals yet — share your link and your first commission will land here.
              </div>
            ) : (
              streams.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-4 px-5 py-4 ${
                    i < streams.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.875rem] font-bold text-dark">
                      {s.business_name}
                    </div>
                    <div className="text-[0.75rem] text-muted">
                      {s.contact_name} · referred{" "}
                      {new Date(s.referred_at).toLocaleDateString("en-AU", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </div>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[0.62rem] font-semibold"
                        style={{
                          background: "var(--color-teal-pale)",
                          color: "var(--color-teal)",
                          border: "1px solid var(--color-teal-bdr)",
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "var(--color-teal)" }}
                        />
                        Active
                      </span>
                      <span className="text-[0.68rem] text-muted">
                        {s.entries.length} entr{s.entries.length === 1 ? "y" : "ies"} · expires{" "}
                        {new Date(s.expires_at).toLocaleDateString("en-AU", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-display text-[1.05rem] font-extrabold text-dark">
                      {formatCents(s.lifetime)}
                    </div>
                    <div className="text-[0.68rem] text-muted">
                      lifetime to date
                    </div>
                    {s.lastEntry && (
                      <div
                        className="text-[0.68rem] mt-1 font-semibold"
                        style={{
                          color:
                            s.lastEntry.status === "paid"
                              ? "var(--color-green)"
                              : "var(--color-amber)",
                        }}
                      >
                        {s.lastEntry.status === "paid" ? "Last paid" : "Pending"}{" "}
                        {formatCents(s.lastEntry.commission_cents)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar: How it works + Payout summary */}
          <aside className="flex flex-col gap-3.5">
            <div className="bg-white border border-border rounded-[22px] overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border font-display font-extrabold text-dark text-[0.9rem]">
                How it works
              </div>
              <div className="px-5 py-4 flex flex-col gap-3">
                <HowStep n={1}>
                  <strong>Share your link</strong> or code with anyone who might
                  need design work.
                </HowStep>
                <HowStep n={2}>
                  When they place an order, we <strong>auto-attribute it</strong>{" "}
                  to your account.
                </HowStep>
                <HowStep n={3}>
                  You earn <strong>{Math.round((partner.commission_pct ?? 0.2) * 100)}%</strong> of every
                  dollar spent for{" "}
                  <strong>{partner.commission_duration_months ?? 12} months</strong>.
                </HowStep>
                <HowStep n={4}>
                  We pay out monthly. No cap. No gotchas.
                </HowStep>
              </div>
            </div>

            <div
              className="rounded-[22px] overflow-hidden shadow-sm text-white"
              style={{ background: "var(--color-navy)" }}
            >
              <div className="px-5 py-4 border-b border-white/10 font-display font-extrabold text-[0.9rem]">
                Payout summary
              </div>
              <div className="px-5 py-4 flex flex-col gap-0">
                <PayoutRow label="Total earned to date">
                  <span className="font-display font-extrabold text-teal text-[0.95rem]">
                    {formatCents(stats.totalEarned)}
                  </span>
                </PayoutRow>
                <PayoutRow label="Pending next payout">
                  {formatCents(stats.pending)}
                </PayoutRow>
                <PayoutRow label="This month so far">
                  {formatCents(stats.thisMonth)}
                </PayoutRow>
                <PayoutRow label="Active streams">
                  {stats.active}
                </PayoutRow>
              </div>
              <div className="px-5 pb-4 text-[0.72rem] text-white/30 leading-relaxed">
                Payouts land in your nominated bank on the 1st of each month.
                Add your details in{" "}
                <span className="text-white/60">Account → Bank details</span>.
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function HeroStat({ label, value, sub, valueClass = "text-white" }) {
  return (
    <div
      className="px-5 py-4"
      style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div
        className={`font-display text-[1.4rem] font-extrabold leading-none mb-0.5 ${valueClass}`}
      >
        {value}
      </div>
      <div className="text-[0.68rem] text-white/35 mb-0.5">{label}</div>
      {sub && (
        <div className="text-[0.68rem] text-white/25">{sub}</div>
      )}
    </div>
  );
}

function ShareButton({ href, icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[0.78rem] font-semibold text-white/70 hover:text-white transition-colors"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      {icon}
      {label}
    </a>
  );
}

function HowStep({ n, children }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[0.68rem] font-extrabold flex-shrink-0 mt-px"
        style={{ background: "var(--color-navy)", color: "white" }}
      >
        {n}
      </div>
      <div className="text-[0.8rem] text-body leading-relaxed">{children}</div>
    </div>
  );
}

function PayoutRow({ label, children }) {
  return (
    <div
      className="flex justify-between py-2 text-[0.82rem]"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-white/40">{label}</span>
      <span className="text-white font-semibold">{children}</span>
    </div>
  );
}
