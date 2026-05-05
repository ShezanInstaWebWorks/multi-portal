"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatCents } from "@/lib/money";
import { OrderAttachments } from "./OrderAttachments";

const TIER_ORDER = ["starter", "growth", "premium"];
const TIER_LABELS = { starter: "Starter", growth: "Growth", premium: "Premium" };
const TIER_COLORS = {
  starter: { bg: "var(--color-off)", text: "var(--color-body)", border: "var(--color-border)" },
  growth:  { bg: "var(--color-teal-pale)", text: "var(--color-teal)", border: "var(--color-teal)" },
  premium: { bg: "rgba(124,58,237,0.08)", text: "var(--color-adm)", border: "var(--color-adm)" },
};

export function DirectStep1BuildOrder({
  services = [],
  packagesByService,
  selections,
  selectPackage,
  toggleRush,
  selectedItems,
  totals,
  onNext,
  attachments = [],
  setAttachments,
}) {
  const [openSections, setOpenSections] = useState(() => {
    const init = {};
    for (const slug of Object.keys(packagesByService)) {
      init[slug] = true;
    }
    return init;
  });

  function toggleSection(slug) {
    setOpenSections((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  const serviceSlugs = Object.keys(packagesByService);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-7 items-start">
      {/* Left column */}
      <div>
        {/* Reference file attachments */}
        {setAttachments && (
          <OrderAttachments attachments={attachments} onChange={setAttachments} />
        )}

        {serviceSlugs.length === 0 && (
          <div className="text-center py-12 text-sm text-muted bg-white border border-border rounded-[14px]">
            No services available yet. Please contact support.
          </div>
        )}

        {serviceSlugs.map((slug) => {
          const pkgs = packagesByService[slug] ?? [];
          if (pkgs.length === 0) return null;

          const svc = services.find((s) => s.slug === slug);
          const serviceIcon = svc?.icon ?? "•";
          const serviceName = svc?.name ?? slug;

          const isOpen = openSections[slug] ?? true;
          const selectedPkgId = selections[slug]?.packageId;
          const selectedPkg = pkgs.find((p) => p.id === selectedPkgId);
          const isRush = selections[slug]?.rush ?? false;

          return (
            <div key={slug} className="mb-4">
              {/* Section header */}
              <button
                type="button"
                onClick={() => toggleSection(slug)}
                className="w-full flex items-center justify-between p-4 bg-white border border-border rounded-[12px] hover:shadow-md transition-all"
                style={selectedPkg ? { borderColor: "var(--color-teal)", borderWidth: 2 } : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[1.3rem]">{serviceIcon}</span>
                  <div className="text-left">
                    <div className="font-display font-extrabold text-[1.05rem] text-dark">
                      {serviceName}
                    </div>
                    <div className="text-[0.72rem] text-muted">
                      {pkgs.length} package{pkgs.length > 1 ? "s" : ""} available
                      {selectedPkg && (
                        <span className="text-teal font-semibold"> · {selectedPkg.name} selected ✓</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted" />
                  )}
                </div>
              </button>

              {/* Package cards */}
              {isOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {pkgs
                    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
                    .map((p) => {
                      const isSelected = p.id === selectedPkgId;
                      const tc = TIER_COLORS[p.tier] ?? TIER_COLORS.starter;
                      const isPopular = p.is_popular || p.tier === "growth";

                      return (
                        <div
                          key={p.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectPackage(slug, p.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              selectPackage(slug, p.id);
                            }
                          }}
                          className={`relative cursor-pointer rounded-[14px] p-5 transition-all bg-white hover:-translate-y-0.5 select-none ${
                            isSelected
                              ? "shadow-[0_4px_20px_rgba(0,184,169,0.18)]"
                              : "shadow-sm hover:shadow-md"
                          }`}
                          style={{
                            border: isSelected
                              ? "2px solid var(--color-teal)"
                              : `1.5px solid ${tc.border}`,
                          }}
                        >
                          {isPopular && (
                            <div
                              className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[0.62rem] font-bold text-white whitespace-nowrap"
                              style={{ background: "var(--color-teal)" }}
                            >
                              Most Popular
                            </div>
                          )}

                          {/* Tier badge */}
                          <div
                            className="inline-flex items-center px-2 py-[3px] rounded-full text-[0.68rem] font-bold mb-3"
                            style={{ background: tc.bg, color: tc.text }}
                          >
                            {TIER_LABELS[p.tier] ?? p.tier}
                          </div>

                          {/* Price — retail for direct clients */}
                          <div className="font-display text-[1.5rem] font-extrabold text-dark leading-none">
                            {formatCents(p.retail_cents)}
                          </div>

                          {/* Package name + description */}
                          <div className="font-display font-bold text-[0.95rem] text-dark mt-2">
                            {p.name}
                          </div>
                          <div className="text-[0.78rem] text-muted mt-0.5">{p.description}</div>

                          {/* Features */}
                          <div className="mt-3 flex flex-col gap-1.5">
                            {(p.features ?? []).slice(0, 6).map((f, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-[0.78rem] text-body">
                                <span className="text-teal font-bold mt-px">✓</span>
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                            <span className="text-[0.72rem] text-muted">
                              {p.delivery_days} day delivery
                            </span>
                          </div>

                          {/* Selection indicator */}
                          {isSelected && (
                            <div
                              className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white text-[0.7rem] font-bold"
                              style={{ background: "var(--color-teal)" }}
                            >
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Rush toggle */}
              {selectedPkg && isOpen && (
                <label
                  className="flex items-center gap-2.5 mt-3 px-4 py-3 bg-white border border-border rounded-[10px] cursor-pointer hover:border-teal transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isRush}
                    onChange={() => toggleRush(slug)}
                    className="w-4 h-4 accent-teal"
                  />
                  <div>
                    <span className="text-[0.85rem] font-semibold text-dark">Rush delivery</span>
                    <span className="ml-2 text-[0.78rem] text-muted">+50% surcharge · faster SLA</span>
                  </div>
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky order summary */}
      <div className="lg:sticky lg:top-6">
        <div className="bg-navy rounded-[16px] p-5 text-white shadow-lg">
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-white/50 mb-3">
            Your Order
          </div>

          {selectedItems.length === 0 ? (
            <div className="text-[0.82rem] text-white/40 text-center py-4">
              Select a package above to begin
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedItems.map((item) => (
                <div key={item.slug} className="flex items-center gap-2 py-1.5 border-b border-white/10 last:border-0">
                  <span className="text-[0.9rem]">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.78rem] font-semibold truncate">{item.serviceName}</div>
                    <div className="text-[0.68rem] text-white/50">{item.packageName}</div>
                  </div>
                  <div className="text-[0.78rem] font-bold">{formatCents(item.retail_cents)}</div>
                </div>
              ))}
            </div>
          )}

          {selectedItems.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-[0.78rem]">
                <span className="text-white/60">Total</span>
                <span className="font-bold">{formatCents(totals.retail)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Continue button */}
        <button
          type="button"
          onClick={onNext}
          disabled={selectedItems.length === 0}
          className="w-full mt-3 px-5 py-3 rounded-[10px] text-sm font-extrabold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-px"
          style={{
            background: "var(--color-teal)",
            boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
          }}
        >
          Continue to Payment →
        </button>
        <p className="text-[0.72rem] text-muted text-center mt-1.5">
          {selectedItems.length > 0
            ? `${selectedItems.length} service${selectedItems.length > 1 ? "s" : ""} selected`
            : "Select a package to continue"}
        </p>
      </div>
    </div>
  );
}
