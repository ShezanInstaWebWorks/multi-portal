"use client";

import { formatCents, applyRush, retailFromCost } from "@/lib/money";

export function Step1Services({ services, draft, setDraft, rushSurcharge }) {
  function toggle(id) {
    setDraft((d) => {
      const next = { ...d.selections };
      if (next[id]) delete next[id];
      else next[id] = { rush: false };
      return { ...d, selections: next };
    });
  }

  function setRush(id, rush) {
    setDraft((d) => ({
      ...d,
      selections: { ...d.selections, [id]: { rush } },
    }));
  }

  return (
    <div>
      <h2 className="font-display text-[1.25rem] font-extrabold text-dark mb-1">
        Pick the services
      </h2>
      <p className="text-sm text-muted mb-6">
        Select one or more — cost shown is your wholesale rate, retail is the
        default 35% markup. Toggle rush for 3–5 day delivery at a 50% surcharge.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map((s) => {
          const selected = !!draft.selections[s.id];
          const rush = selected && draft.selections[s.id].rush;
          const cost = rush ? applyRush(s.cost_price_cents, rushSurcharge) : s.cost_price_cents;
          const retail = retailFromCost(cost);

          return (
            <div
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`relative cursor-pointer rounded-[16px] p-5 transition-all bg-white hover:-translate-y-0.5 ${
                selected
                  ? "shadow-[0_4px_20px_rgba(0,184,169,0.18)]"
                  : "shadow-sm hover:shadow-md"
              }`}
              style={{
                border: selected
                  ? "1.5px solid var(--color-teal)"
                  : "1.5px solid var(--color-border)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-[1.3rem] shrink-0"
                  style={{
                    background: "var(--color-teal-pale)",
                    color: "var(--color-teal)",
                  }}
                >
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-extrabold text-[1.05rem] text-dark leading-tight">
                    {s.name}
                  </div>
                  <div className="text-[0.72rem] text-muted mt-0.5">
                    SLA {rush ? s.rush_sla_days : s.sla_days} days
                    {rush && " (rush)"}
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    selected ? "text-white" : ""
                  }`}
                  style={{
                    background: selected ? "var(--color-teal)" : "transparent",
                    border: selected
                      ? "2px solid var(--color-teal)"
                      : "2px solid var(--color-border)",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                  }}
                >
                  {selected ? "✓" : ""}
                </div>
              </div>

              <div className="flex items-baseline gap-3 mt-4">
                <div className="font-display text-[1.6rem] font-extrabold text-dark leading-none">
                  {formatCents(cost)}
                </div>
                <div className="text-[0.72rem] text-muted">your cost</div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[0.78rem] text-muted">
                  Retail {formatCents(retail)}
                </div>
                <div className="text-[0.82rem] font-bold text-green">
                  +{formatCents(retail - cost)} profit
                </div>
              </div>

              {selected && (
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 mt-3.5 pt-3 border-t border-border text-[0.82rem] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={rush}
                    onChange={(e) => setRush(s.id, e.target.checked)}
                    className="w-4 h-4 accent-teal"
                  />
                  <span className="font-semibold text-body">Rush delivery</span>
                  <span className="text-muted">(+50% cost)</span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
