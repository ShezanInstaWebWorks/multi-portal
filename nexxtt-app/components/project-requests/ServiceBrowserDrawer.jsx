"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X, ChevronDown } from "lucide-react";

// Right-side service catalog. Each service expands into three tier cards
// (Starter / Growth / Premium). Picking a tier toggles that package id in
// the parent's selection. At most one package per service is selected at a
// time — picking a different tier of the same service replaces the previous.
//
// Props:
//   open              — whether the drawer is mounted
//   services          — [{ id, name, icon, slug }]
//   packages          — [{ id, service_id, tier, name, description, cost_cents,
//                          retail_cents, features, delivery_days, is_popular, sort_order }]
//   selectedPackageIds — uuid[]
//   onTogglePackage    — (packageId, serviceId) => void
//   onClose
//   showCost           — true for agency viewers (shows your-cost + retail + profit);
//                        false for client viewers (retail only)
export function ServiceBrowserDrawer({
  open,
  services = [],
  packages = [],
  selectedPackageIds = [],
  onTogglePackage,
  onClose,
  showCost = true,
}) {
  const [query, setQuery] = useState("");
  const [openServiceIds, setOpenServiceIds] = useState(() => new Set());

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Group packages by service_id; preserve service order from the prop list.
  const grouped = useMemo(() => {
    const byService = new Map();
    for (const s of services) {
      byService.set(s.id, { service: s, packages: [] });
    }
    for (const p of packages) {
      const slot = byService.get(p.service_id);
      if (slot) slot.packages.push(p);
    }
    for (const slot of byService.values()) {
      slot.packages.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return [...byService.values()];
  }, [services, packages]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? grouped.filter((g) =>
        g.service.name.toLowerCase().includes(q) ||
        (g.service.slug ?? "").toLowerCase().includes(q) ||
        g.packages.some((p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
        )
      )
    : grouped;

  const selectedPackages = packages.filter((p) => selectedPackageIds.includes(p.id));
  const totalCost = selectedPackages.reduce((sum, p) => sum + (p.cost_cents ?? 0), 0);
  const totalRetail = selectedPackages.reduce((sum, p) => sum + (p.retail_cents ?? 0), 0);

  function toggleService(id) {
    setOpenServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 right-0 h-screen w-full sm:w-[720px] bg-white z-[70] shadow-[-4px_0_40px_rgba(11,31,58,0.25)] flex flex-col transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Browse services"
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 bg-white shrink-0">
          <div className="min-w-0">
            <div className="text-lg font-bold text-gray-900">
              Select Services
            </div>
            <div className="text-sm text-gray-500">
              Choose packages for your project
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No services match "{query}".
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((g) => (
                <ServiceRow
                  key={g.service.id}
                  service={g.service}
                  packages={g.packages}
                  expanded={openServiceIds.has(g.service.id) || filtered.length === 1 || !!q}
                  selectedPackageIds={selectedPackageIds}
                  onToggleService={() => toggleService(g.service.id)}
                  onTogglePackage={onTogglePackage}
                  showCost={showCost}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <div className="text-sm">
            <span className="font-semibold text-gray-900">{selectedPackages.length}</span>
            <span className="text-gray-500"> selected</span>
            {selectedPackages.length > 0 && (
              <>
                <span className="text-gray-400"> · </span>
                <span className="font-semibold text-gray-900">
                  ${((showCost ? totalCost : totalRetail) / 100).toLocaleString("en-AU")}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-teal hover:bg-teal-600 transition-colors"
          >
            Confirm Selection
          </button>
        </footer>
      </aside>
    </>
  );
}

function ServiceRow({ service, packages, expanded, selectedPackageIds, onToggleService, onTogglePackage, showCost }) {
  if (packages.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        <span className="text-lg mr-2">{service.icon ?? "•"}</span>
        <span className="font-semibold text-gray-900">{service.name}</span>
        <span className="ml-2">— packages not configured yet.</span>
      </div>
    );
  }

  const selectedForService = packages.filter(p => selectedPackageIds.includes(p.id));
  const hasSelection = selectedForService.length > 0;

  return (
    <div className="bg-white">
      <button
        type="button"
        onClick={onToggleService}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
          style={{
            background: hasSelection ? "rgba(0,184,169,0.15)" : "rgba(0,184,169,0.08)",
            color: hasSelection ? "#00b8a9" : "#00a095",
          }}
        >
          {service.icon ?? "•"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-base">
            {service.name}
          </div>
          {service.description && (
            <div className="text-sm text-gray-500 mt-0.5 truncate">{service.description}</div>
          )}
        </div>
        {hasSelection && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal text-white text-sm font-medium">
            <Check className="w-4 h-4" />
            {selectedForService.length} selected
          </div>
        )}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform ${
            expanded ? "rotate-180 bg-gray-100" : "bg-gray-50"
          }`}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
          <div className="pt-3 space-y-3">
            {packages.map((pkg) => {
              const isSelected = selectedPackageIds.includes(pkg.id);
              const tierStyles = {
                starter: { label: "STARTER", bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
                growth: { label: "GROWTH", bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
                premium: { label: "PREMIUM", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
              };
              const tierStyle = tierStyles[pkg.tier] || tierStyles.starter;
              const features = pkg.features || [];

              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => onTogglePackage(pkg.id, service.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    isSelected
                      ? "bg-white border-2 border-teal shadow-md"
                      : "bg-white border border-gray-200 hover:border-teal/50"
                  }`}
                >
                  {/* Header with tier badge and price */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-teal text-white" : "border-2 border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${tierStyle.bg} ${tierStyle.text}`}>
                            {tierStyle.label}
                          </span>
                          {pkg.is_popular && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal text-white">
                              MOST POPULAR
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-gray-900 mt-1">{pkg.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        ${((showCost ? pkg.cost_cents : pkg.retail_cents) / 100).toLocaleString("en-AU")}
                      </div>
                      {pkg.delivery_days && (
                        <div className="text-xs text-gray-500">{pkg.delivery_days} days delivery</div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {pkg.description && (
                    <div className="text-sm text-gray-600 mb-3">
                      {pkg.description}
                    </div>
                  )}

                  {/* Features list */}
                  {features.length > 0 && (
                    <div className="space-y-1.5">
                      {features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-teal shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Profit info for agency */}
                  {showCost && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Retail: ${(pkg.retail_cents / 100).toLocaleString("en-AU")}</span>
                      <span className="text-sm font-semibold text-green">
                        +${((pkg.retail_cents - pkg.cost_cents) / 100).toLocaleString("en-AU")} profit
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

