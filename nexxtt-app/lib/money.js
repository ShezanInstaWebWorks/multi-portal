// Money helpers. All cents math stays in integers; only format for display.

export function formatCents(cents) {
  if (cents == null || isNaN(cents)) return "—";
  const dollars = cents / 100;
  return dollars.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// Default markup from the MD-memory note: 35% on top of cost.
export const DEFAULT_MARKUP_PCT = 35;

export function retailFromCost(cost_cents, markup_pct = DEFAULT_MARKUP_PCT) {
  return Math.round(cost_cents * (1 + markup_pct / 100));
}

// Rush surcharge from platform_config (0.50 = 50% of cost added).
export function applyRush(cost_cents, rush_surcharge = 0.5) {
  return Math.round(cost_cents * (1 + rush_surcharge));
}
