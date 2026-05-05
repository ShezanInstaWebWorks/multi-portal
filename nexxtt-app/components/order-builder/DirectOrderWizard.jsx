"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { DirectStep1BuildOrder } from "./DirectStep1BuildOrder";
import { DirectStep2ConfirmPay } from "./DirectStep2ConfirmPay";
import { formatCents } from "@/lib/money";

const STEPS = [
  { n: 1, label: "Build Order" },
  { n: 2, label: "Confirm & Pay" },
];

export function DirectOrderWizard({ services, packages, user }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // selections[serviceSlug] = { packageId, rush }
  const [selections, setSelections] = useState({});
  // briefs[serviceSlug] = { ... }
  const [briefs, setBriefs] = useState({});
  // attachments: [{ path, name, size, mime }]
  const [attachments, setAttachments] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Group packages by service slug
  const packagesByService = useMemo(() => {
    const map = {};
    for (const p of packages) {
      const svc = services.find((s) => s.id === p.service_id);
      if (svc) {
        if (!map[svc.slug]) map[svc.slug] = [];
        map[svc.slug].push(p);
      }
    }
    return map;
  }, [services, packages]);

  // Selected items with full data
  const selectedItems = useMemo(() => {
    return Object.entries(selections)
      .map(([slug, sel]) => {
        const svc = services.find((s) => s.slug === slug);
        if (!svc) return null;
        const pkg = packages.find((p) => p.id === sel.packageId);
        if (!pkg) return null;
        const retail = pkg.retail_cents;
        return {
          slug,
          serviceId: svc.id,
          serviceName: svc.name,
          icon: svc.icon,
          packageId: pkg.id,
          packageName: pkg.name,
          tier: pkg.tier,
          deliveryDays: pkg.delivery_days,
          features: pkg.features ?? [],
          retail_cents: retail,
          rush: sel.rush,
        };
      })
      .filter(Boolean);
  }, [selections, services, packages]);

  const totals = useMemo(() => {
    const retail = selectedItems.reduce((a, s) => a + s.retail_cents, 0);
    return { retail };
  }, [selectedItems]);

  const selectPackage = useCallback((slug, packageId) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[slug]?.packageId === packageId) {
        delete next[slug];
      } else {
        next[slug] = { ...(next[slug] || {}), packageId };
      }
      return next;
    });
  }, []);

  const toggleRush = useCallback((slug) => {
    setSelections((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], rush: !prev[slug]?.rush },
    }));
  }, []);

  const canAdvance = {
    1: selectedItems.length > 0,
    2: termsAccepted,
  }[step];

  async function handleSubmit() {
    if (!canAdvance) return;
    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      attachments,
      items: selectedItems.map((s) => ({
        serviceId: s.serviceId,
        packageId: s.packageId,
        rush: s.rush,
        retail_cents: s.retail_cents,
        brief: briefs[s.slug] ?? {},
      })),
    };

    try {
      const res = await fetch("/api/direct-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitting(false);
        setSubmitError(body.error ?? `Request failed (${res.status})`);
        return;
      }

      router.push(`/direct/orders/${body.job.id}`);
      router.refresh();
    } catch {
      setSubmitting(false);
      setSubmitError("Network error. Please try again.");
    }
  }

  const stepProps = {
    services,
    packages,
    packagesByService,
    selections,
    selectPackage,
    toggleRush,
    selectedItems,
    totals,
    briefs,
    setBriefs,
    attachments,
    setAttachments,
    paymentMethod,
    setPaymentMethod,
    termsAccepted,
    setTermsAccepted,
    submitError,
    user,
    onNext: () => canAdvance && setStep((s) => s + 1),
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-24 lg:pb-8 max-w-[1200px] mx-auto w-full">
      {/* Back link */}
      <Link
        href="/direct/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to my orders
      </Link>

      {/* Progress bar */}
      <div
        className="h-[3px] rounded-full overflow-hidden mb-7"
        style={{ background: "var(--color-lg)" }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${(step / STEPS.length) * 100}%`,
            background: "linear-gradient(90deg, var(--color-teal), var(--color-teal-l))",
          }}
        />
      </div>

      {/* Steps */}
      <div className="flex items-end gap-0 mb-8 flex-wrap">
        {STEPS.map((s) => {
          const state = step === s.n ? "active" : step > s.n ? "done" : "pending";
          return (
            <div
              key={s.n}
              className="flex items-center gap-2.5 pb-4 flex-1 min-w-[120px]"
              style={{
                borderBottom:
                  state === "pending"
                    ? "2px solid var(--color-border)"
                    : "2px solid var(--color-teal)",
              }}
            >
              <div
                className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[0.72rem] font-extrabold shrink-0 transition-all"
                style={
                  state === "active"
                    ? {
                        background: "var(--color-navy)",
                        color: "white",
                        boxShadow: "0 0 0 4px rgba(11,31,58,0.1)",
                      }
                    : state === "done"
                    ? { background: "var(--color-teal)", color: "white" }
                    : { background: "var(--color-lg)", color: "var(--color-muted)" }
                }
              >
                {state === "done" ? <Check className="w-3.5 h-3.5" /> : s.n}
              </div>
              <div
                className={`text-[0.82rem] font-semibold transition-colors ${
                  state === "active"
                    ? "text-navy"
                    : state === "done"
                    ? "text-teal"
                    : "text-muted"
                }`}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="mb-8">
        {step === 1 && <DirectStep1BuildOrder {...stepProps} />}
        {step === 2 && <DirectStep2ConfirmPay {...stepProps} />}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap sticky bottom-4 lg:static">
        <div className="text-sm text-muted">
          {selectedItems.length > 0 && (
            <>
              Total{" "}
              <span className="font-bold text-dark">
                {formatCents(totals.retail)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-[10px] text-sm font-semibold bg-white border border-border text-body hover:border-navy hover:shadow-md transition-all"
            >
              Back
            </button>
          )}
          {step < 2 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance}
              className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-px"
              style={{
                background: "var(--color-teal)",
                boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
              }}
            >
              Continue to Payment →
            </button>
          )}
          {step === 2 && (
            <button
              onClick={handleSubmit}
              disabled={!canAdvance || submitting}
              className="px-5 py-2.5 rounded-[10px] text-sm font-extrabold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-px"
              style={{
                background: "var(--color-teal)",
                boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
              }}
            >
              {submitting ? "Placing order…" : `Place Order · Pay ${formatCents(totals.retail)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
