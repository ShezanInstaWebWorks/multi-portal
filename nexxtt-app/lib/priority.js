// Priority Unlock tiers (MD §28).
// Pure helpers — no DB access. Input is `total_jobs_count` from agencies.

export const TIERS = [
  {
    key:    "starter",
    label:  "Starter",
    min:    0,
    color:  "var(--color-muted)",
    perks:  ["Basic client portal", "3 services available"],
  },
  {
    key:    "rising",
    label:  "Rising",
    min:    5,
    color:  "var(--color-teal)",
    perks:  ["All 5 services", "Custom portal URL"],
  },
  {
    key:    "pro",
    label:  "Pro",
    min:    10,
    color:  "#f97316",
    perks:  ["Priority support", "Rush orders", "White-label email"],
  },
  {
    key:    "elite",
    label:  "Elite",
    min:    25,
    color:  "#7c3aed",
    perks:  ["Dedicated account manager", "Custom pricing", "API access"],
  },
];

export function tierFor(jobsCount) {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (jobsCount >= t.min) current = t;
  }
  const idx = TIERS.indexOf(current);
  const next = TIERS[idx + 1] ?? null;
  return { current, next, all: TIERS };
}

export function tierProgress(jobsCount) {
  const { current, next } = tierFor(jobsCount);
  if (!next) return { pct: 100, toGo: 0, current, next: null };
  const span = next.min - current.min;
  const done = jobsCount - current.min;
  const pct = Math.max(0, Math.min(100, Math.round((done / span) * 100)));
  return { pct, toGo: next.min - jobsCount, current, next };
}

export function hasFeature(jobsCount, tierKey) {
  const threshold = TIERS.find((t) => t.key === tierKey)?.min ?? Infinity;
  return jobsCount >= threshold;
}
