"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, X, Paperclip, FileText, LayoutGrid } from "lucide-react";
import { useToast } from "@/components/shared/Toast";
import { ServiceBrowserDrawer } from "./ServiceBrowserDrawer";

const MAX_REQUEST_FILES = 5;
const MAX_REQUEST_FILE_BYTES = 10 * 1024 * 1024;

// Shared "new project request" form. The caller scopes what gets submitted —
// agency_client + direct_client don't need to pick a counterparty, but an
// agency initiator must pass `clientId` and an admin initiator must pass
// `directClientUserId`.
//
// Multi-service: picking N services produces ONE bundled request whose
// `service_ids` is the picked array. The amount field is the bundle total
// — auto-filled from the sum of the picked services' default retail prices,
// but the user can override. On convert, admin's API fans the bundle out
// into N projects under one job and splits the agreed amount evenly.
export function RequestForm({
  services = [],
  packages = [],
  showCost = true,
  defaultClientId = null,
  defaultDirectClientUserId = null,
  compact = false,
  onCreated,
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [packageIds, setPackageIds] = useState([]);
  const [amountDollars, setAmountDollars] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);

  // Toggle a package; only one tier per service is allowed (picking another
  // tier of the same service replaces the previous selection).
  function togglePackage(packageId, serviceId) {
    setPackageIds((prev) => {
      if (prev.includes(packageId)) return prev.filter((id) => id !== packageId);
      const filtered = prev.filter((id) => {
        const p = packages.find((x) => x.id === id);
        return !p || p.service_id !== serviceId;
      });
      return [...filtered, packageId];
    });
  }

  function addFiles(picked) {
    const list = Array.from(picked ?? []);
    if (list.length === 0) return;
    const room = MAX_REQUEST_FILES - files.length;
    if (room <= 0) {
      toast.error(`Max ${MAX_REQUEST_FILES} files per request`);
      return;
    }
    const accepted = [];
    for (const f of list.slice(0, room)) {
      if (f.size > MAX_REQUEST_FILE_BYTES) {
        toast.error(`"${f.name}" is over 10 MB`);
        continue;
      }
      accepted.push(f);
    }
    setFiles((prev) => [...prev, ...accepted]);
  }
  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // Auto-fill amount as the sum of selected packages' retail prices, unless
  // the user has typed something themselves. (We always show retail to the
  // form's amount field — that's what the counterparty negotiates.)
  useEffect(() => {
    if (amountTouched) return;
    if (packageIds.length === 0) {
      setAmountDollars("");
      return;
    }
    const totalCents = packages
      .filter((p) => packageIds.includes(p.id))
      .reduce((sum, p) => sum + (p.retail_cents ?? 0), 0);
    if (totalCents > 0) setAmountDollars(String(Math.round(totalCents / 100)));
  }, [packageIds, packages, amountTouched]);

  async function submit(e) {
    e.preventDefault();
    const amountNum = Number(amountDollars);
    if (amountDollars.trim() === "" || !Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Suggested amount is required");
      return;
    }
    setSubmitting(true);

    let res;
    if (files.length > 0) {
      // Multipart path so attachments ride along with the form fields.
      const fd = new FormData();
      fd.set("title", title.trim());
      if (description.trim()) fd.set("description", description.trim());
      if (packageIds.length > 0) fd.set("packageIds", packageIds.join(","));
      fd.set("proposedAmountCents", String(Math.round(amountNum * 100)));
      if (deliveryDate)              fd.set("proposedDeliveryDate", deliveryDate);
      if (defaultClientId)            fd.set("clientId", defaultClientId);
      if (defaultDirectClientUserId)  fd.set("directClientUserId", defaultDirectClientUserId);
      for (const f of files) fd.append("files", f);
      res = await fetch("/api/project-requests", { method: "POST", body: fd });
    } else {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        packageIds,
        proposedAmountCents: Math.round(amountNum * 100),
      };
      if (deliveryDate)              body.proposedDeliveryDate = deliveryDate;
      if (defaultClientId)            body.clientId = defaultClientId;
      if (defaultDirectClientUserId)  body.directClientUserId = defaultDirectClientUserId;
      res = await fetch("/api/project-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    const payload = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      toast.error(payload.error ?? `Request failed (${res.status})`);
      return;
    }
    toast.success("Offer sent");
    setTitle(""); setDescription(""); setPackageIds([]);
    setAmountDollars(""); setAmountTouched(false); setDeliveryDate("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onCreated?.(payload.request ?? payload.requests?.[0] ?? null);
    router.refresh();
  }

  const selectedPackages = packages.filter((p) => packageIds.includes(p.id));

  return (
    <>
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

        <Field label="Services & packages (pick one tier per service)">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setBrowserOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-[10px] border border-border bg-white text-left hover:border-teal transition-colors"
            >
              <LayoutGrid className="w-4 h-4 text-teal shrink-0" />
              <span className="flex-1 text-[0.85rem] text-dark font-semibold">
                {selectedPackages.length === 0
                  ? "Browse the catalog →"
                  : `${selectedPackages.length} package${selectedPackages.length === 1 ? "" : "s"} selected — edit`}
              </span>
              <ChevronDown className="w-4 h-4 text-muted shrink-0" />
            </button>

            {selectedPackages.length > 0 && (
              <ul className="flex flex-col gap-1">
                {selectedPackages.map((p) => {
                  const svc = services.find((s) => s.id === p.service_id);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] bg-off border border-border"
                    >
                      <span className="text-[0.95rem]">{svc?.icon ?? "•"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.82rem] font-semibold text-dark truncate">
                          {svc?.name ?? "Service"} · {p.name}
                        </div>
                        <div className="text-[0.7rem] text-muted">
                          {p.tier?.toUpperCase()} · ${(p.retail_cents / 100).toLocaleString("en-AU")}
                          {p.delivery_days ? ` · ${p.delivery_days}-day` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePackage(p.id, p.service_id)}
                        className="text-muted hover:text-red"
                        aria-label={`Remove ${p.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Suggested amount (AUD)" required>
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              required
              value={amountDollars}
              onChange={(e) => { setAmountDollars(e.target.value); setAmountTouched(true); }}
              placeholder="e.g. 1500"
            />
            {!amountTouched && selectedPackages.length > 0 && (
              <span className="text-[0.7rem] text-muted mt-1 block">
                Auto-filled from sum of selected services. Edit to override.
              </span>
            )}
          </Field>
          <Field label="Proposed delivery date (optional)">
            <input
              className="input"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="What do you want done?">
          <textarea
            className="input min-h-[96px]"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the scope, deadlines, any references. Discuss the rest in chat."
          />
        </Field>

        <Field label={`Reference files (optional, max ${MAX_REQUEST_FILES} × 10 MB)`}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= MAX_REQUEST_FILES}
              className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[0.78rem] font-semibold text-body border border-border bg-white hover:border-teal hover:text-teal disabled:opacity-40"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Attach files
            </button>
            {files.length > 0 && (
              <ul className="flex flex-col gap-1">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] bg-off border border-border"
                  >
                    <FileText className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span className="text-[0.78rem] text-dark truncate flex-1">{f.name}</span>
                    <span className="text-[0.7rem] text-muted">{formatBytes(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-muted hover:text-red"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              submitting ||
              title.trim().length < 2 ||
              amountDollars.trim() === "" ||
              Number(amountDollars) <= 0
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--color-teal)", boxShadow: "0 2px 10px rgba(0,184,169,0.25)" }}
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>
    </form>

    <ServiceBrowserDrawer
      open={browserOpen}
      services={services}
      packages={packages}
      selectedPackageIds={packageIds}
      onTogglePackage={togglePackage}
      showCost={showCost}
      onClose={() => setBrowserOpen(false)}
    />
    </>
  );
}

function ServiceMultiSelect({ services, selectedIds, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedServices = services.filter((s) => selectedIds.includes(s.id));
  const totalCents = selectedServices.reduce(
    (sum, s) => sum + (s.default_retail_cents ?? s.cost_price_cents ?? 0),
    0
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger is a div (not a button) so the chips' inner × buttons remain
          valid HTML — nested <button>s break hydration. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); }
          if (e.key === "Escape") setOpen(false);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-[10px] border border-border bg-white text-left cursor-pointer hover:border-teal transition-colors focus:outline-none focus:border-teal focus-visible:ring-2 focus-visible:ring-teal/30"
      >
        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
          {selectedServices.length === 0 ? (
            <span className="text-[0.85rem] text-muted">— Pick services —</span>
          ) : (
            selectedServices.map((s) => (
              <Chip key={s.id} service={s} onRemove={(e) => { e.stopPropagation(); onToggle(s.id); }} />
            ))
          )}
        </div>
        {totalCents > 0 && (
          <span className="text-[0.78rem] font-semibold text-dark whitespace-nowrap">
            AUD {(totalCents / 100).toLocaleString("en-AU")}
          </span>
        )}
        <ChevronDown
          className="w-4 h-4 text-muted shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </div>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-[10px] border border-border bg-white shadow-[0_10px_30px_rgba(11,31,58,0.12)] max-h-72 overflow-y-auto">
          {services.length === 0 ? (
            <div className="px-3 py-3 text-[0.82rem] text-muted">No services available.</div>
          ) : (
            services.map((s) => {
              const price = s.default_retail_cents ?? s.cost_price_cents ?? null;
              const checked = selectedIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors border-b border-border last:border-0 ${
                    checked ? "bg-teal-pale" : "hover:bg-off"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      background: checked ? "var(--color-teal)" : "white",
                      borderColor: checked ? "var(--color-teal)" : "var(--color-border)",
                    }}
                  >
                    {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => onToggle(s.id)}
                  />
                  <span className="flex-1 min-w-0 text-[0.85rem] flex items-center gap-1.5">
                    <span>{s.icon ?? "•"}</span>
                    <span className="font-semibold text-dark truncate">{s.name}</span>
                  </span>
                  {price != null && (
                    <span className="text-[0.78rem] text-muted">
                      AUD {(price / 100).toLocaleString("en-AU", { minimumFractionDigits: 0 })}
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ service, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[0.72rem] font-semibold bg-off border border-border text-body whitespace-nowrap"
    >
      <span>{service.icon ?? "•"}</span>
      <span>{service.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-muted hover:text-red"
        aria-label={`Remove ${service.name}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function formatBytes(n) {
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
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
