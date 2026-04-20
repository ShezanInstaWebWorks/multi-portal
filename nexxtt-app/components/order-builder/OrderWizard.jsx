"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Step1Services } from "./Step1Services";
import { Step2Brief } from "./Step2Brief";
import { Step3Client } from "./Step3Client";
import { Step4Confirm } from "./Step4Confirm";
import { formatCents, retailFromCost, applyRush } from "@/lib/money";

const STEPS = [
  { n: 1, label: "Services" },
  { n: 2, label: "Brief" },
  { n: 3, label: "Client" },
  { n: 4, label: "Confirm" },
];

export function OrderWizard({ services, clients, agency, rushSurcharge }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState({
    // selections[serviceId] = { rush: bool }
    selections: {},
    // briefs[serviceId] = { businessName, goals, referenceUrls }
    briefs: {},
    clientId: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const selectedServices = useMemo(
    () =>
      services
        .filter((s) => draft.selections[s.id])
        .map((s) => {
          const sel = draft.selections[s.id];
          const cost = sel.rush
            ? applyRush(s.cost_price_cents, rushSurcharge)
            : s.cost_price_cents;
          const retail = retailFromCost(cost);
          return { ...s, rush: !!sel.rush, cost_cents: cost, retail_cents: retail };
        }),
    [services, draft.selections, rushSurcharge]
  );

  const totals = useMemo(() => {
    const cost = selectedServices.reduce((a, s) => a + s.cost_cents, 0);
    const retail = selectedServices.reduce((a, s) => a + s.retail_cents, 0);
    return { cost, retail, profit: retail - cost };
  }, [selectedServices]);

  const canAdvance = {
    1: selectedServices.length > 0,
    2: selectedServices.every(
      (s) => (draft.briefs[s.id]?.businessName || "").trim().length >= 2
    ),
    3: !!draft.clientId,
    4: true,
  }[step];

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      clientId: draft.clientId,
      items: selectedServices.map((s) => ({
        serviceId: s.id,
        rush: s.rush,
        cost_cents: s.cost_cents,
        retail_cents: s.retail_cents,
        brief: draft.briefs[s.id] ?? {},
      })),
    };

    const res = await fetch("/api/jobs", {
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

    router.push(`/agency/orders/${body.job.id}`);
    router.refresh();
  }

  const stepProps = {
    services,
    clients,
    agency,
    rushSurcharge,
    draft,
    setDraft,
    selectedServices,
    totals,
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-24 lg:pb-8 max-w-[1200px] mx-auto w-full">
      {/* Back link */}
      <Link
        href="/agency/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to dashboard
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
        {STEPS.map((s, i) => {
          const state =
            step === s.n ? "active" : step > s.n ? "done" : "pending";
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
                className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[0.72rem] font-extrabold flex-shrink-0 transition-all"
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
        {step === 1 && <Step1Services {...stepProps} />}
        {step === 2 && <Step2Brief {...stepProps} />}
        {step === 3 && <Step3Client {...stepProps} />}
        {step === 4 && <Step4Confirm {...stepProps} error={submitError} />}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap sticky bottom-4 lg:static">
        <div className="text-sm text-muted">
          {selectedServices.length > 0 && (
            <>
              Total cost{" "}
              <span className="font-bold text-dark">
                {formatCents(totals.cost)}
              </span>{" "}
              · Profit{" "}
              <span className="font-bold text-green">
                {formatCents(totals.profit)}
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
          {step < 4 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance}
              className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-px"
              style={{
                background: "var(--color-teal)",
                boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
              }}
            >
              Continue →
            </button>
          )}
          {step === 4 && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2.5 rounded-[10px] text-sm font-extrabold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-px"
              style={{
                background: "var(--color-teal)",
                boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
              }}
            >
              {submitting ? "Placing order…" : "Place order →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
