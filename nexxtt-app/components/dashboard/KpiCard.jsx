import { Sparkline } from "./Sparkline";

// accent: one of { blue, teal, rose }
const ACCENTS = {
  blue: { border: "#3b82f6", sparkColor: "#3b82f6" },
  teal: { border: "var(--color-teal)", sparkColor: "var(--color-teal)" },
  rose: { border: "#f43f5e", sparkColor: "#f43f5e" },
};

export function KpiCard({ label, value, delta, deltaUp, sparkHeights, accent = "teal", inverted = false }) {
  const a = ACCENTS[accent] ?? ACCENTS.teal;

  return (
    <div
      className={`relative rounded-xl p-5 flex items-start justify-between overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${
        inverted ? "" : "bg-white border border-border"
      } shadow-sm hover:shadow-md`}
      style={{
        borderTop: `3px solid ${a.border}`,
        background: inverted ? "var(--color-navy)" : undefined,
      }}
    >
      <div>
        <div
          className={`text-xs font-semibold uppercase mb-2.5 ${
            inverted ? "text-white/45" : "text-muted"
          }`}
          style={{ letterSpacing: "0.08em" }}
        >
          {label}
        </div>
        <div
          className={`font-display text-[1.9rem] font-extrabold leading-none ${
            inverted ? "text-white" : "text-dark"
          }`}
          style={{ letterSpacing: "-0.03em" }}
        >
          {value}
        </div>
        {delta && (
          <div
            className="text-[0.78rem] mt-1.5 flex items-center gap-1"
            style={{
              color: inverted ? "#fb7185" : deltaUp ? "var(--color-green)" : "var(--color-muted)",
            }}
          >
            {delta}
          </div>
        )}
      </div>
      {sparkHeights && <Sparkline heights={sparkHeights} color={a.sparkColor} />}
    </div>
  );
}
