"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { formatCents } from "@/lib/money";

const TIER_ORDER = ["starter", "growth", "premium"];
const TIER_LABELS = { starter: "Starter", growth: "Growth", premium: "Premium" };
const TIER_COLORS = {
  starter: { bg: "var(--color-off)", text: "var(--color-body)", border: "var(--color-border)" },
  growth: { bg: "var(--color-teal-pale)", text: "var(--color-teal)", border: "var(--color-teal)" },
  premium: { bg: "rgba(124,58,237,0.08)", text: "var(--color-adm)", border: "var(--color-adm)" },
};

export function Step1BuildOrder({
  clients,
  packagesByService,
  selections,
  selectPackage,
  toggleRush,
  selectedItems,
  totals,
  clientId,
  setClientId,
}) {
  const [openSections, setOpenSections] = useState({});

  function toggleSection(slug) {
    setOpenSections((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  const selectedClient = clients.find((c) => c.id === clientId);

  // Group services by their slug from packagesByService
  const serviceSlugs = Object.keys(packagesByService);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-7 items-start">
      {/* Left column */}
      <div>
        {/* Client selector */}
        <div className="flex items-center gap-3 p-4 bg-white border border-border rounded-[12px] mb-7">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--color-teal-pale)", color: "var(--color-teal)" }}
          >
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[0.82rem] font-semibold text-muted whitespace-nowrap">Order for:</span>
          <select
            value={clientId ?? ""}
            onChange={(e) => setClientId(e.target.value || null)}
            className="flex-1 px-3 py-2 border border-border rounded-[8px] text-[0.9rem] font-semibold outline-none bg-white text-dark focus:border-teal"
          >
            <option value="">Select existing client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name} — {c.contact_name}
              </option>
            ))}
          </select>
        </div>

        {/* Service sections */}
        {serviceSlugs.map((slug) => {
          const pkgs = packagesByService[slug] ?? [];
          if (pkgs.length === 0) return null;
          const isOpen = openSections[slug] ?? false;
          const selectedPkgId = selections[slug]?.packageId;
          const selectedPkg = pkgs.find((p) => p.id === selectedPkgId);
          const isRush = selections[slug]?.rush;

          return (
            <div key={slug} className="mb-4">
              {/* Section header */}
              <button
                onClick={() => toggleSection(slug)}
                className="w-full flex items-center justify-between p-4 bg-white border border-border rounded-[12px] hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[1.3rem]">{pkgs[0]?.service_icon ?? "•"}</span>
                  <div className="text-left">
                    <div className="font-display font-extrabold text-[1.05rem] text-dark">
                      {pkgs[0]?.service_name ?? slug}
                    </div>
                    <div className="text-[0.72rem] text-muted">
                      {pkgs.length} package{pkgs.length > 1 ? "s" : ""} available
                      {selectedPkg && ` · ${selectedPkg.name} selected`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedPkg && (
                    <span className="text-[0.78rem] font-bold text-teal">
                      {formatCents(selectedPkg.cost_cents)} – {formatCents(pkgs[pkgs.length - 1]?.cost_cents ?? 0)}
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted" />
                  )}
                </div>
              </button>

              {/* Packages */}
              {isOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {pkgs
                    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
                    .map((p) => {
                      const isSelected = p.id === selectedPkgId;
                      const tc = TIER_COLORS[p.tier] ?? TIER_COLORS.starter;
                      const profit = p.retail_cents - p.cost_cents;
                      const isPopular = p.is_popular || p.tier === "growth";

                      return (
                        <div
                          key={p.id}
                          onClick={() => selectPackage(slug, p.id)}
                          className={`relative cursor-pointer rounded-[14px] p-5 transition-all bg-white hover:-translate-y-0.5 ${
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
                              className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[0.62rem] font-bold text-white"
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

                          {/* Price */}
                          <div className="font-display text-[1.5rem] font-extrabold text-dark leading-none">
                            {formatCents(p.cost_cents)}
                            <span className="text-[0.72rem] font-normal text-muted ml-1">your cost</span>
                          </div>

                          {/* Package name */}
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
                              Retail {formatCents(p.retail_cents)}
                            </span>
                            <span className="text-[0.82rem] font-bold text-green">
                              +{formatCents(profit)} profit
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
            </div>
          );
        })}
      </div>

      {/* Sticky cart panel */}
      <div className="lg:sticky lg:top-6">
        <div className="bg-navy rounded-[16px] p-5 text-white shadow-lg">
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-white/50 mb-3">
            Your Order
          </div>

          {selectedItems.length === 0 ? (
            <div className="text-[0.82rem] text-white/40 text-center py-4">
              Select a package to begin
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
                  <div className="text-[0.78rem] font-bold">{formatCents(item.sell_cents)}</div>
                </div>
              ))}
            </div>
          )}

          {selectedItems.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-[0.78rem]">
                <span className="text-white/60">Total cost</span>
                <span className="font-bold">{formatCents(totals.cost)}</span>
              </div>
              <div className="flex items-center justify-between text-[0.78rem] mt-1">
                <span className="text-white/60">Est. profit</span>
                <span className="font-bold text-green">{formatCents(totals.profit)}</span>
              </div>
            </div>
          )}
        </div>

        <button
          disabled={selectedItems.length === 0}
          className="w-full mt-3 px-5 py-3 rounded-[10px] text-sm font-extrabold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-px"
          style={{
            background: "var(--color-teal)",
            boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
          }}
        >
          Set Pricing →
        </button>
        <p className="text-[0.72rem] text-muted text-center mt-1.5">
          {selectedItems.length > 0
            ? `${selectedItems.length} service${selectedItems.length > 1 ? "s" : ""} in order`
            : "Select a package to continue"}
        </p>
      </div>
    </div>
  );
}
