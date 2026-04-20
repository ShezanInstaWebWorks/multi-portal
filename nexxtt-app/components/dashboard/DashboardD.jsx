"use client";

// Wireframe s04d — command-center: 4 stat boxes, gantt timeline, activity +
// dark earnings chart. Agency shell sidebar stays visible; the wireframe's
// "wide command sidebar" profile card is rendered inline at the top as a
// welcome strip.

const STATS = [
  { label: "ACTIVE",      value: "3",     pill: "+1",         pillCls: "bg-teal/10 text-teal border border-teal/20",         border: "var(--color-teal)"  },
  { label: "REVENUE APR", value: "$6,800", pill: "↑18%",       pillCls: "bg-green/10 text-green border border-green/20",     border: "#3b82f6"            },
  { label: "PROFIT APR",  value: "$4,200", pill: "42% margin", pillCls: "bg-green/10 text-green border border-green/20",     border: "var(--color-green)" },
  { label: "CLIENTS",     value: "4",     pill: "2 portal",   pillCls: "bg-amber/10 text-amber border border-amber/20",     border: "var(--color-amber)" },
];

const GANTT_ROWS = [
  {
    title: "Website Design",
    client: "Coastal Realty",
    status: "IN PROGRESS",
    barStyle: {
      left: "14%",
      width: "38%",
      background: "linear-gradient(90deg,#1e40af,#3b82f6)",
      color: "white",
    },
    profit: "$480",
  },
  {
    title: "Logo Design",
    client: "TechCore SaaS",
    status: "IN REVIEW",
    barStyle: {
      left: "20%",
      width: "14%",
      background: "linear-gradient(90deg,#b45309,#f59e0b)",
      color: "var(--color-dark)",
    },
    profit: "$220",
  },
  {
    title: "Brand Guidelines",
    client: "Bloom Beauty",
    status: "DELIVERED",
    barStyle: {
      left: "7%",
      width: "48%",
      background: "linear-gradient(90deg,#059669,#10b981)",
      color: "white",
    },
    profit: "$380",
  },
  {
    title: "SEO Refresh",
    client: "Maple Clinics",
    status: "INTAKE",
    barStyle: {
      left: "72%",
      width: "16%",
      background: "transparent",
      border: "2px dashed rgba(124,58,237,0.4)",
      color: "var(--color-adm)",
    },
    profit: null,
  },
];

const DATES = [
  "Apr 8", "Apr 9", "Apr 10", "Apr 11", "Apr 12", "Apr 13", "Apr 14",
  "Apr 15", "Apr 16", "Apr 17", "Apr 18", "Apr 19", "TODAY", "Apr 21",
];

const ACTIVITY = [
  { tag: "DELIVERY",  tagCls: "bg-green/10 text-green border-green/30",  title: "Logo Design delivered to Solo Advisory", sub: "$220 profit confirmed", time: "2d ago" },
  { tag: "NEW ORDER", tagCls: "bg-blue/10  text-blue  border-blue/30",   title: "Brand Guidelines · Bloom Beauty",         sub: "$380",                  time: "4d ago" },
  { tag: "FINANCE",   tagCls: "bg-amber/10 text-amber border-amber/30", title: "Prepaid balance top-up",                  sub: "$4,000 · 10% off · valid 6 months", time: "1w ago" },
];

export function DashboardD() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-6 pb-20 lg:pb-8">
      {/* Welcome strip with Priority Unlock */}
      <div
        className="rounded-[12px] p-4 mb-5 border border-border shadow-sm"
        style={{
          background: "linear-gradient(135deg, var(--color-off), white)",
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[0.78rem] font-extrabold text-white flex-shrink-0"
            style={{
              background: "var(--color-amber)",
              boxShadow: "0 2px 8px rgba(245,158,11,0.35)",
            }}
          >
            AJ
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[0.88rem] font-bold text-dark">Alex Johnson</div>
            <div
              className="text-[0.68rem] text-muted uppercase"
              style={{ letterSpacing: "0.04em" }}
            >
              AGENCY PARTNER · PRO
            </div>
          </div>
          <div className="flex-1 min-w-[180px] max-w-[260px]">
            <div
              className="text-[0.65rem] font-bold uppercase text-muted flex justify-between mb-1.5"
              style={{ letterSpacing: "0.1em" }}
            >
              <span>PRIORITY UNLOCK</span>
              <span style={{ color: "#f43f5e" }}>7/10</span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--color-lg)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: "70%",
                  background: "linear-gradient(90deg,#f97316,#fbbf24)",
                  boxShadow: "0 1px 4px rgba(249,115,22,0.4)",
                }}
              />
            </div>
            <div className="text-[0.68rem] text-muted mt-1">
              3 more jobs to unlock
            </div>
          </div>
        </div>
      </div>

      {/* 4 stat boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="relative bg-white border border-border rounded-[10px] px-5 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ background: s.border }}
            />
            <div
              className="text-[0.65rem] uppercase text-muted font-bold mb-1"
              style={{ letterSpacing: "0.1em" }}
            >
              {s.label}
            </div>
            <div className="font-display text-[2rem] font-extrabold text-dark leading-none">
              {s.value}
            </div>
            <span
              className={`inline-block mt-1.5 rounded-full px-2 py-[1px] text-[0.62rem] font-bold ${s.pillCls}`}
            >
              {s.pill}
            </span>
          </div>
        ))}
      </div>

      {/* Gantt timeline */}
      <section className="mb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
          <h2 className="font-display text-[1.2rem] font-extrabold text-dark">
            Active orders · timeline
          </h2>
          <div className="flex gap-1.5">
            <LegendPill color="var(--color-teal)"  label="in progress" />
            <LegendPill color="var(--color-amber)" label="in review" />
            <LegendPill color="var(--color-green)" label="delivered" />
          </div>
        </div>

        <div className="overflow-x-auto bg-white border border-border rounded-[16px] shadow-sm">
          <div className="min-w-[720px]">
            {/* Date header */}
            <div
              className="flex items-center border-b-2 border-border h-9 bg-off"
              style={{ paddingLeft: "220px" }}
            >
              {DATES.map((d) => (
                <div
                  key={d}
                  className="flex-1 text-center text-[0.65rem] font-bold whitespace-nowrap"
                  style={{
                    letterSpacing: "0.06em",
                    color: d === "TODAY" ? "var(--color-red)" : "var(--color-muted)",
                    fontWeight: d === "TODAY" ? 800 : 700,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Rows */}
            {GANTT_ROWS.map((row, i) => (
              <div
                key={i}
                className="flex items-center h-[52px]"
                style={{
                  borderBottom:
                    i < GANTT_ROWS.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <div
                  className="w-[220px] flex-shrink-0 px-4 border-r border-border"
                >
                  <div className="text-[0.85rem] font-bold text-dark">
                    {row.title}
                  </div>
                  <div className="text-[0.72rem] text-muted">{row.client}</div>
                </div>
                <div className="flex-1 relative h-[52px]">
                  <div
                    className="absolute h-[26px] top-[13px] rounded-full flex items-center justify-center text-[0.68rem] font-extrabold px-3 whitespace-nowrap"
                    style={{
                      ...row.barStyle,
                      letterSpacing: "0.04em",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                  >
                    {row.status}
                  </div>
                  {/* Today line */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px]"
                    style={{
                      left: "87%",
                      background: "var(--color-red)",
                      boxShadow: "0 0 8px rgba(239,68,68,0.5)",
                      zIndex: 10,
                    }}
                  />
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 font-display font-extrabold text-[0.9rem]"
                    style={{
                      color: row.profit ? "var(--color-green)" : "var(--color-muted)",
                    }}
                  >
                    {row.profit ?? "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Activity + Dark earnings chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3.5">
            <h2 className="font-display text-[1.2rem] font-extrabold text-dark">
              Activity
            </h2>
            <div className="text-[0.75rem] text-muted">
              jump to:{" "}
              <span className="text-teal font-semibold cursor-pointer">all</span>
              {" · "}
              <span className="cursor-pointer">mine</span>
              {" · "}
              <span className="cursor-pointer">finance</span>
            </div>
          </div>
          <div className="flex flex-col">
            {ACTIVITY.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 py-3 ${
                  i < ACTIVITY.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span
                  className={`rounded-full px-2 py-[2px] text-[0.62rem] font-extrabold border ${a.tagCls}`}
                  style={{ letterSpacing: "0.08em" }}
                >
                  {a.tag}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.85rem] font-bold text-dark">
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

        <DarkEarningsChart />
      </div>
    </div>
  );
}

function LegendPill({ color, label }) {
  return (
    <span
      className="px-2 py-[3px] rounded-full text-[0.65rem] font-bold flex items-center gap-1 border"
      style={{
        color,
        background: `${color}14`,
        borderColor: `${color}33`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: "currentColor" }}
      />
      {label}
    </span>
  );
}

function DarkEarningsChart() {
  return (
    <div
      className="rounded-[16px] p-5 shadow-lg"
      style={{
        background: "linear-gradient(160deg,#0f1a2e,#1a2d4a)",
      }}
    >
      <div
        className="text-[0.65rem] font-bold uppercase text-white/35 mb-1.5"
        style={{ letterSpacing: "0.12em" }}
      >
        LAST 6 MONTHS · PROFIT
      </div>
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <div
          className="font-display text-[1.8rem] font-extrabold text-white"
          style={{ letterSpacing: "-0.03em" }}
        >
          $3,140
        </div>
        <span
          className="text-[0.68rem] font-bold px-2 py-[3px] rounded-full border"
          style={{
            background: "rgba(16,185,129,0.2)",
            color: "var(--color-green)",
            borderColor: "rgba(16,185,129,0.3)",
          }}
        >
          ↑ trend
        </span>
      </div>
      <svg viewBox="0 0 280 90" width="100%" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="darkChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f43f5e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path
          d="M0,75 C20,72 40,60 60,55 C80,50 100,45 120,38 C140,30 160,25 180,18 C200,12 220,8 240,5 C260,3 270,2 280,1 L280,90 L0,90 Z"
          fill="url(#darkChartGrad)"
        />
        <path
          d="M0,75 C20,72 40,60 60,55 C80,50 100,45 120,38 C140,30 160,25 180,18 C200,12 220,8 240,5 C260,3 270,2 280,1"
          fill="none"
          stroke="#f43f5e"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <text x="0"   y="88" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="sans-serif">Nov</text>
        <text x="50"  y="88" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="sans-serif">Dec</text>
        <text x="108" y="88" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="sans-serif">Jan</text>
        <text x="162" y="88" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="sans-serif">Feb</text>
        <text x="218" y="88" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="sans-serif">Mar</text>
      </svg>
    </div>
  );
}
