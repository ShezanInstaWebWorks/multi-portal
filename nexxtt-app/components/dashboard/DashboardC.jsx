"use client";

// Wireframe s04c — orange/amber hero + kanban pipeline + activity.
// Agency shell sidebar stays visible; the horizontal kanban-topnav from the
// wireframe is omitted because the shell already provides navigation.

const COMPACT_STATS = [
  {
    label: "REVENUE (APR)",
    value: "$6,800",
    deltaLabel: "↑ 18%",
    deltaColor: "var(--color-green)",
    borderColor: "#3b82f6",
    bars: [40, 60, 55, 75, 90, 100],
  },
  {
    label: "ACTIVE JOBS",
    value: "3",
    deltaLabel: "+1 new",
    deltaColor: "var(--color-teal)",
    borderColor: "var(--color-navy)",
    bars: [50, 70, 60, 80, 70, 100],
    barColor: "var(--color-navy)",
  },
  {
    label: "LIFETIME PROFIT",
    value: "$3,140",
    deltaLabel: "all time",
    deltaColor: "var(--color-muted)",
    borderColor: "var(--color-muted)",
    bars: [20, 35, 50, 65, 80, 100],
    barColor: "var(--color-muted)",
  },
];

const COLUMNS = [
  {
    key: "intake",
    label: "INTAKE",
    count: 1,
    bg: "rgba(124,58,237,0.08)",
    color: "var(--color-adm)",
    pillBg: "rgba(124,58,237,0.15)",
    cards: [
      {
        title: "SEO refresh",
        client: "Maple Clinics",
        meta: "unscheduled",
        progressColor: "rgba(124,58,237,0.25)",
        progressWidth: 100,
      },
    ],
  },
  {
    key: "in_progress",
    label: "IN PROGRESS",
    count: 1,
    bg: "var(--color-teal-bg)",
    color: "var(--color-teal)",
    pillBg: "var(--color-teal-bdr)",
    cards: [
      {
        title: "Website Design",
        client: "Coastal Realty",
        due: "Apr 14",
        profit: "$480",
        progressColor: "var(--color-teal)",
        progressWidth: 65,
      },
    ],
  },
  {
    key: "in_review",
    label: "IN REVIEW",
    count: 1,
    bg: "rgba(245,158,11,0.1)",
    color: "var(--color-amber)",
    pillBg: "rgba(245,158,11,0.2)",
    cards: [
      {
        title: "Logo Design",
        client: "TechCore SaaS",
        due: "Apr 11",
        profit: "$220",
        progressColor: "var(--color-amber)",
        progressWidth: 85,
      },
    ],
  },
  {
    key: "delivered",
    label: "DELIVERED",
    count: 2,
    bg: "rgba(239,68,68,0.08)",
    color: "var(--color-red)",
    pillBg: "rgba(239,68,68,0.15)",
    cards: [
      {
        title: "Brand Guidelines",
        client: "Bloom Beauty",
        due: "Apr 16",
        profit: "$380",
        progressColor: "var(--color-green)",
        progressWidth: 100,
        opacity: 0.85,
      },
      {
        title: "Logo Design",
        client: "Solo Advisory",
        due: "Apr 08",
        profit: "$220",
        progressColor: "var(--color-green)",
        progressWidth: 100,
        opacity: 0.75,
      },
    ],
  },
];

const ACTIVITY = [
  { dot: "var(--color-green)", shadow: "rgba(16,185,129,0.5)",  title: "Logo Design delivered",    sub: "$220 profit confirmed",               time: "2d ago" },
  { dot: "#3b82f6",            shadow: "rgba(59,130,246,0.5)",  title: "New order placed",          sub: "Brand Guidelines · Bloom Beauty",     time: "4d ago" },
  { dot: "var(--color-amber)", shadow: "rgba(245,158,11,0.5)",  title: "Prepaid balance top-up",    sub: "$4,000 · 10% off · valid 6 months",   time: "1w ago" },
];

export function DashboardC() {
  return (
    <div className="pb-20 lg:pb-8">
      {/* Orange/amber hero banner */}
      <div
        className="relative overflow-hidden px-5 lg:px-8 py-7"
        style={{
          background:
            "linear-gradient(135deg, #f97316 0%, #fb923c 30%, #fbbf24 65%, #f59e0b 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: "280px",
            height: "280px",
            top: "-80px",
            right: "120px",
            background: "rgba(251,146,60,0.3)",
          }}
        />
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: "200px",
            height: "200px",
            bottom: "-60px",
            right: "-30px",
            background: "rgba(251,191,36,0.35)",
          }}
        />

        <div
          className="relative z-[1] grid gap-6 max-w-[1200px] mx-auto w-full"
          style={{ gridTemplateColumns: "minmax(0, 1.8fr) minmax(0, 1fr)" }}
        >
          {/* Profit hero */}
          <div>
            <div className="flex gap-2.5 mb-3 flex-wrap">
              <HeroPill>APRIL 2026</HeroPill>
              <HeroPill>↑ trending</HeroPill>
            </div>
            <div
              className="text-[0.78rem] font-bold uppercase mb-1"
              style={{ letterSpacing: "0.1em", color: "rgba(0,0,0,0.5)" }}
            >
              YOU&apos;VE PROFITED
            </div>
            <div
              className="font-display font-extrabold text-white leading-none"
              style={{
                fontSize: "clamp(2.2rem, 6vw, 4rem)",
                letterSpacing: "-0.04em",
                textShadow: "0 2px 20px rgba(0,0,0,0.15)",
              }}
            >
              $4,200
            </div>
            <div
              className="text-[0.88rem] mt-2.5 leading-relaxed"
              style={{ color: "rgba(0,0,0,0.55)" }}
            >
              That&apos;s 42% margin across 3 active jobs. Best month since you joined —{" "}
              <strong style={{ color: "rgba(0,0,0,0.7)" }}>keep going.</strong>
            </div>
          </div>

          {/* 3 compact stat cards */}
          <div className="flex flex-col gap-2.5">
            {COMPACT_STATS.map((s) => (
              <CompactStat key={s.label} {...s} />
            ))}
          </div>
        </div>
      </div>

      {/* Kanban + Activity */}
      <div
        className="grid gap-5 px-5 lg:px-8 py-6 max-w-[1200px] mx-auto w-full items-start"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 340px" }}
      >
        {/* Pipeline */}
        <div className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="font-display text-[1.2rem] font-extrabold text-dark">
              Pipeline
            </h2>
            <div className="flex gap-1.5">
              <FilterPill active>This week</FilterPill>
              <FilterPill>All time</FilterPill>
              <FilterPill outline>+ Filter</FilterPill>
            </div>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {COLUMNS.map((col) => (
              <div key={col.key} className="flex-1 min-w-[200px]">
                <div
                  className="flex items-center justify-between text-[0.7rem] font-extrabold uppercase px-3 py-2 rounded-lg mb-2.5"
                  style={{
                    letterSpacing: "0.12em",
                    background: col.bg,
                    color: col.color,
                  }}
                >
                  <span>{col.label}</span>
                  <span
                    className="px-[7px] py-[1px] rounded-full text-[0.65rem]"
                    style={{ background: col.pillBg }}
                  >
                    {col.count}
                  </span>
                </div>
                {col.cards.map((c, i) => (
                  <div
                    key={i}
                    className="bg-white border border-border rounded-[10px] p-3.5 mb-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                    style={{ opacity: c.opacity ?? 1 }}
                  >
                    <div className="text-[0.85rem] font-bold text-dark">
                      {c.title}
                    </div>
                    <div className="text-[0.72rem] text-muted mt-0.5">
                      {c.client}
                    </div>
                    {c.meta && (
                      <div className="text-[0.72rem] text-muted mt-1.5">
                        {c.meta}
                      </div>
                    )}
                    <div
                      className="h-[3px] rounded-full mt-2.5 overflow-hidden"
                      style={{ background: "var(--color-lg)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${c.progressWidth}%`,
                          background: c.progressColor,
                        }}
                      />
                    </div>
                    {(c.due || c.profit) && (
                      <div className="flex justify-between mt-2">
                        <span className="text-[0.72rem] text-muted">{c.due}</span>
                        <span className="font-display font-extrabold text-[0.9rem] text-green">
                          {c.profit}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <div
                  className="border border-dashed border-border rounded-[10px] p-2.5 text-center text-[0.78rem] text-muted cursor-pointer hover:border-teal hover:text-teal hover:bg-teal-pale transition-colors"
                >
                  + Add
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity sidebar */}
        <div className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
          <h2 className="font-display text-[1.2rem] font-extrabold text-dark mb-3.5">
            Activity
          </h2>
          <div className="flex flex-col gap-3">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="w-2 h-2 rounded-full mt-[5px] shrink-0"
                  style={{
                    background: a.dot,
                    boxShadow: `0 0 6px ${a.shadow}`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[0.85rem] font-semibold text-dark">
                    {a.title}
                  </div>
                  <div className="text-[0.72rem] text-muted">{a.sub}</div>
                </div>
                <div className="text-[0.72rem] text-muted whitespace-nowrap">
                  {a.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroPill({ children }) {
  return (
    <span
      className="px-2.5 py-[3px] rounded-full text-[0.72rem] font-bold text-white whitespace-nowrap"
      style={{ background: "rgba(0,0,0,0.15)" }}
    >
      {children}
    </span>
  );
}

function CompactStat({ label, value, deltaLabel, deltaColor, borderColor, bars, barColor = "#3b82f6" }) {
  return (
    <div
      className="bg-white rounded-[10px] px-4 py-3.5 flex items-center justify-between gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="min-w-0">
        <div
          className="text-[0.65rem] uppercase text-muted font-bold"
          style={{ letterSpacing: "0.1em" }}
        >
          {label}
        </div>
        <div className="font-display text-[1.2rem] font-extrabold text-dark">
          {value}{" "}
          <span className="text-[0.75rem]" style={{ color: deltaColor }}>
            {deltaLabel}
          </span>
        </div>
      </div>
      <div className="flex items-end gap-[2px] h-7 shrink-0">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-[5px] rounded-t-[2px]"
            style={{
              height: `${h}%`,
              background: barColor,
              opacity: 0.4 + (i / bars.length) * 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FilterPill({ active, outline, children }) {
  const base =
    "rounded-full px-3.5 py-1 text-[0.72rem] font-semibold transition-colors";
  if (active)  return <button className={`${base} bg-dark text-white`}>{children}</button>;
  if (outline) return <button className={`${base} border border-border text-body hover:border-navy hover:bg-white`}>{children}</button>;
  return <button className={`${base} text-body hover:bg-lg`}>{children}</button>;
}
