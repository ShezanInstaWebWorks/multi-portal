"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";

// Shared "new project request" form. The caller scopes what gets submitted —
// agency_client + direct_client don't need to pick a counterparty, but an
// agency initiator must pass `clientId` and an admin initiator must pass
// `directClientUserId`.
export function RequestForm({
  services = [],
  defaultClientId = null,
  defaultDirectClientUserId = null,
  compact = false,
  onCreated,
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [amountDollars, setAmountDollars] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      serviceId: serviceId || null,
      proposedAmountCents:
        amountDollars.trim() === "" ? null : Math.round(Number(amountDollars) * 100),
    };
    if (deliveryDate)              body.proposedDeliveryDate = deliveryDate;
    if (defaultClientId)            body.clientId = defaultClientId;
    if (defaultDirectClientUserId)  body.directClientUserId = defaultDirectClientUserId;

    const res = await fetch("/api/project-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      toast.error(payload.error ?? `Request failed (${res.status})`);
      return;
    }
    toast.success("Offer sent");
    setTitle(""); setDescription(""); setServiceId(""); setAmountDollars(""); setDeliveryDate("");
    onCreated?.(payload.request);
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className={`bg-white border border-border rounded-[12px] ${compact ? "p-3.5" : "p-4 sm:p-5"} shadow-sm`}
    >
      <div className="text-[0.95rem] font-bold text-dark mb-2.5">Request a new project</div>

      <div className="flex flex-col gap-3">
        <Field label="Title" required>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Website refresh, Logo redesign"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Service (optional)">
            <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">— Pick a service —</option>
              {services.map((s) => {
                const price = s.default_retail_cents ?? s.cost_price_cents ?? null;
                return (
                  <option key={s.id} value={s.id}>
                    {s.icon ? `${s.icon} ` : ""}
                    {s.name}
                    {price != null ? ` · AUD ${(price / 100).toLocaleString("en-AU", { minimumFractionDigits: 0 })}` : ""}
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label="Suggested amount (AUD, optional)">
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              placeholder="e.g. 1500"
            />
          </Field>
        </div>

        <Field label="Proposed delivery date (optional)">
          <input
            className="input"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </Field>

        <Field label="What do you want done?">
          <textarea
            className="input min-h-[96px]"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the scope, deadlines, any references. Discuss the rest in chat."
          />
        </Field>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || title.trim().length < 2}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--color-teal)", boxShadow: "0 2px 10px rgba(0,184,169,0.25)" }}
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="block text-[0.75rem] font-bold text-body mb-1.5">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}
