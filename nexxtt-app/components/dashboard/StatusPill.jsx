// Gradient status pills used on Dashboard A's Active Orders table.
// Matches wireframe `.pill-lg` variants.
const PILLS = {
  in_progress: {
    label: "● In Progress",
    bg: "linear-gradient(135deg, rgba(0,184,169,0.15), rgba(0,212,195,0.08))",
    color: "var(--color-teal)",
    border: "1.5px solid var(--color-teal-bdr)",
  },
  in_review: {
    label: "● In Review",
    bg: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.06))",
    color: "var(--color-amber)",
    border: "1.5px solid rgba(245,158,11,0.3)",
  },
  delivered: {
    label: "● Delivered",
    bg: "linear-gradient(135deg, rgba(244,63,94,0.12), rgba(244,63,94,0.05))",
    color: "#f43f5e",
    border: "1.5px solid rgba(244,63,94,0.25)",
  },
};

export function StatusPill({ status }) {
  const p = PILLS[status] ?? PILLS.in_progress;
  return (
    <span
      className="inline-flex items-center px-3.5 py-[5px] rounded-full text-[0.78rem] font-bold"
      style={{ background: p.bg, color: p.color, border: p.border }}
    >
      {p.label}
    </span>
  );
}
