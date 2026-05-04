"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { formatCents } from "@/lib/money";

export function Step2SetPricing({
  selectedItems,
  totals,
  sellPrices,
  updateSellPrice,
  selections,
  toggleRush,
  packages,
  rushSurcharge,
}) {
  const [editValues, setEditValues] = useState(() => {
    const map = {};
    for (const item of selectedItems) {
      map[item.slug] = (sellPrices[item.slug] ?? item.sell_cents) / 100;
    }
    return map;
  });

  function handleInputChange(slug, value) {
    setEditValues((prev) => ({ ...prev, [slug]: value }));
  }

  function handleBlur(slug) {
    const val = parseFloat(editValues[slug]);
    if (!isNaN(val) && val >= 0) {
      updateSellPrice(slug, Math.round(val * 100));
    }
  }

  function handleKeyDown(slug, e) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  }

  function getItemCost(item) {
    const pkg = packages.find((p) => p.id === item.packageId);
    if (!pkg) return item.cost_cents;
    return item.rush
      ? Math.round(pkg.cost_cents * (1 + rushSurcharge))
      : pkg.cost_cents;
  }

  if (selectedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "var(--color-off)" }}
        >
          <AlertCircle className="w-8 h-8 text-muted" />
        </div>
        <div className="font-display font-bold text-[1.1rem] text-dark">No services selected</div>
        <div className="text-[0.82rem] text-muted mt-1">Go back and select at least one service package.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 p-4 bg-teal-pale border border-teal rounded-[12px] mb-7">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--color-teal)", color: "white" }}
        >
          <DollarSign className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[0.82rem] font-semibold text-navy">Set your selling prices</div>
          <div className="text-[0.72rem] text-muted">
            Adjust prices per service. Your profit = selling price − our cost.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {selectedItems.map((item) => {
          const cost = getItemCost(item);
          const sell = sellPrices[item.slug] ?? item.sell_cents;
          const profit = sell - cost;
          const margin = sell > 0 ? ((profit / sell) * 100).toFixed(1) : "0.0";
          const editVal = editValues[item.slug] ?? (sell / 100);

          return (
            <div
              key={item.slug}
              className="bg-white border border-border rounded-[14px] p-5"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[1.3rem]">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-display font-bold text-[0.95rem] text-dark">
                    {item.serviceName}
                  </div>
                  <div className="text-[0.72rem] text-muted">
                    {item.packageName}
                    {item.rush && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[0.62rem] font-bold text-orange bg-orange/10">
                        RUSH
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[0.68rem] text-muted">Our cost</div>
                  <div className="text-[0.82rem] font-bold text-dark">{formatCents(cost)}</div>
                </div>
              </div>

              {/* Price input row */}
              <div className="flex items-center gap-4 p-4 rounded-[10px]" style={{ background: "var(--color-off)" }}>
                <div className="flex-1">
                  <label className="text-[0.68rem] font-semibold text-muted uppercase tracking-[0.05em]">
                    Your selling price
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="w-4 h-4 text-muted" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editVal}
                      onChange={(e) => handleInputChange(item.slug, e.target.value)}
                      onBlur={() => handleBlur(item.slug)}
                      onKeyDown={(e) => handleKeyDown(item.slug, e)}
                      className="w-full px-3 py-2 border border-border rounded-[8px] text-[1.1rem] font-bold outline-none bg-white text-dark focus:border-teal"
                    />
                  </div>
                </div>

                {/* Profit display */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    <TrendingUp className={`w-4 h-4 ${profit >= 0 ? "text-green" : "text-red"}`} />
                    <span className={`text-[0.82rem] font-bold ${profit >= 0 ? "text-green" : "text-red"}`}>
                      {formatCents(profit)}
                    </span>
                  </div>
                  <div className="text-[0.68rem] text-muted mt-0.5">
                    {margin}% margin
                  </div>
                </div>
              </div>

              {/* Rush toggle */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="text-[0.78rem] text-muted">
                  Rush delivery (+{Math.round(rushSurcharge * 100)}%)
                </div>
                <button
                  onClick={() => toggleRush(item.slug)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    item.rush ? "bg-teal" : "bg-border"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      item.rush ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="mt-6 p-5 bg-navy rounded-[14px] text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-white/50">
              Order totals
            </div>
            <div className="text-[0.82rem] text-white/60 mt-1">
              {selectedItems.length} service{selectedItems.length > 1 ? "s" : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[0.68rem] text-white/50">Total cost</div>
            <div className="text-[1.3rem] font-extrabold">{formatCents(totals.cost)}</div>
          </div>
          <div className="text-right">
            <div className="text-[0.68rem] text-white/50">Total sell</div>
            <div className="text-[1.3rem] font-extrabold">{formatCents(totals.sell)}</div>
          </div>
          <div className="text-right">
            <div className="text-[0.68rem] text-white/50">Est. profit</div>
            <div className="text-[1.3rem] font-extrabold text-green">{formatCents(totals.profit)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
