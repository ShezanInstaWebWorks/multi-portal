"use client";

// Wireframe s04b — Bento grid dashboard.
const ORDERS = [
  {
    id: "1",
    initials: "CR",
    title: "Website Design",
    sub: "Coastal Realty · 5 pages · Business",
    status: "in_progress",
    progressPct: 65,
    progressColor: "var(--color-teal)",
    tintBg: "linear-gradient(135deg, rgba(0,184,169,0.2), rgba(0,184,169,0.08))",
    tintBorder: "var(--color-teal-bdr)",
    tintColor: "var(--color-teal)",
    due: "Apr 14",
    profit: "$480",
  },
  {
    id: "2",
    initials: "TS",
    title: "Logo Design",
    sub: "TechCore SaaS · 3 concepts",
    status: "in_review",
    progressPct: 85,
    progressColor: "var(--color-amber)",
    tintBg: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))",
    tintBorder: "rgba(245,158,11,0.25)",
    tintColor: "var(--color-amber)",
    due: "Apr 11",
    profit: "$220",
  },
  {
    id: "3",
    initials: "BB",
    title: "Brand Guidelines",
    sub: "Bloom Beauty · Full system",
    status: "delivered",
    progressPct: 100,
    progressColor: "var(--color-green)",
    tintBg: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))",
    tintBorder: "rgba(16,185,129,0.3)",
    tintColor: "var(--color-green)",
    due: "Apr 16",
    profit: "$380",
  },
];

const TIMELINE = [
  { dot: "var(--color-green)", title: "Logo Design delivered", sub: "$220 profit confirmed", time: "2d ago" },
  { dot: "#3b82f6",            title: "New order placed",       sub: "Brand Guidelines · Bloom Beauty", time: "4d ago" },
  { dot: "var(--color-amber)", title: "Prepaid balance top-up", sub: "$4,000 · 10% off", time: "1w ago" },
  { dot: "#f43f5e",            title: "Invoice sent",            sub: "Coastal Realty · $1,120", time: "1w ago" },
];

export function DashboardB() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8">
      {/* Greeting */}
      <div className="mb-5">
        <div
          className="text-[0.72rem] font-medium text-muted uppercase"
          style={{ letterSpacing: "0.04em" }}
        >
          GOOD MORNING, ALEX
        </div>
        <div className="font-display text-[1.4rem] lg:text-[1.1rem] font-extrabold text-dark">
          Your{" "}
          <span
            className="underline"
            style={{
              textUnderlineOffset: "3px",
              textDecorationColor: "var(--color-amber)",
            }}
          >
            dashboard
          </span>
        </div>
      </div>

      {/* Bento grid */}
      <div
        className="grid gap-3.5 mb-5"
        style={{
          gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1fr)",
          gridTemplateRows: "auto auto",
        }}
      >
        {/* Hero (spans 2 rows, column 1) */}
        <div
          className="relative overflow-hidden rounded-[22px] p-7 min-h-[220px]"
          style={{
            gridRow: "1 / span 2",
            background:
              "linear-gradient(135deg,#1a1a3e 0%,#1e2d60 35%,#2563a8 65%,#1a3a6c 100%)",
            boxShadow: "0 8px 32px rgba(30,45,96,0.3)",
          }}
        >
          {/* Decorative circles */}
          <div
            className="pointer-events-none absolute rounded-full"
            style={{
              width: "200px",
              height: "200px",
              top: "-60px",
              right: "-40px",
              background: "rgba(120,60,200,0.35)",
            }}
          />
          <div
            className="pointer-events-none absolute rounded-full"
            style={{
              width: "240px",
              height: "240px",
              bottom: "-80px",
              right: "60px",
              background: "rgba(80,40,160,0.25)",
            }}
          />
          <div className="relative z-[1]">
            <div
              className="text-[0.7rem] font-bold uppercase text-white/40 mb-1.5"
              style={{ letterSpacing: "0.14em" }}
            >
              THIS MONTH · APR
            </div>
            <div
              className="font-display text-5xl font-extrabold text-white leading-none"
              style={{ letterSpacing: "-0.04em" }}
            >
              $6,800
            </div>
            <div className="flex gap-5 mt-3 flex-wrap">
              <MiniMetric label="PROFIT" value="$4,200" color="var(--color-teal)" />
              <MiniMetric label="MARGIN" value="42%"    color="#fbbf24" />
              <MiniMetric label="VS MAR" value="↑18%"   color="#fb7185" />
            </div>
            <div className="mt-5">
              <svg viewBox="0 0 200 50" width="100%" style={{ opacity: 0.5 }}>
                <polyline
                  points="0,45 30,38 60,30 90,25 120,18 150,12 180,6 200,4"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Jobs */}
        <BentoTile>
          <div
            className="text-xs font-semibold uppercase text-muted mb-2"
            style={{ letterSpacing: "0.08em" }}
          >
            ACTIVE JOBS
          </div>
          <div
            className="font-display text-[2.4rem] font-extrabold text-navy leading-none"
          >
            3
          </div>
          <div className="flex items-end gap-1 h-7 mt-2.5">
            <div className="flex-1 rounded-t-[3px]" style={{ background: "var(--color-teal)",  height: "45%", opacity: 0.5 }} />
            <div className="flex-1 rounded-t-[3px]" style={{ background: "var(--color-amber)", height: "70%", opacity: 0.6 }} />
            <div className="flex-1 rounded-t-[3px]" style={{ background: "var(--color-red)",   height: "30%", opacity: 0.5 }} />
          </div>
          <div className="text-[0.78rem] mt-2 text-green">↑ 1 new this week</div>
        </BentoTile>

        {/* Total Earned — amber gradient */}
        <BentoTile
          className="text-white"
          style={{
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            border: "none",
            boxShadow: "0 6px 20px rgba(245,158,11,0.3)",
          }}
        >
          <div
            className="text-[0.68rem] font-bold uppercase text-white/65 mb-1.5"
            style={{ letterSpacing: "0.12em" }}
          >
            TOTAL EARNED
          </div>
          <div
            className="font-display text-[2rem] font-extrabold text-white"
            style={{ letterSpacing: "-0.03em" }}
          >
            $3,140
          </div>
          <div className="text-[0.75rem] text-white/70 mt-1">
            Since joining nexxtt.io
          </div>
        </BentoTile>

        {/* Clients */}
        <BentoTile>
          <div className="flex items-center gap-2">
            <div className="font-display text-[2rem] font-extrabold" style={{ color: "#3b82f6" }}>
              4
            </div>
            <div>
              <div className="text-[0.85rem] font-bold text-dark">clients managed</div>
              <div className="text-[0.72rem] text-muted">2 with portal access</div>
            </div>
          </div>
        </BentoTile>

        {/* Jobs */}
        <BentoTile>
          <div className="flex items-center gap-2">
            <div className="font-display text-[2rem] font-extrabold text-navy">7</div>
            <div>
              <div className="text-[0.85rem] font-bold text-dark">jobs all-time</div>
              <div className="text-[0.72rem] text-muted">3 until priority unlock</div>
            </div>
          </div>
        </BentoTile>
      </div>

      {/* Two-col: Orders + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <Card>
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <h2 className="font-display text-[1.2rem] font-extrabold text-dark">
              Active Orders
            </h2>
            <div className="flex gap-1.5">
              <FilterPill active>All</FilterPill>
              <FilterPill>Mine</FilterPill>
              <FilterPill>Overdue</FilterPill>
            </div>
          </div>
          <div className="flex flex-col">
            {ORDERS.map((o, i) => (
              <div
                key={o.id}
                className={`flex items-center gap-3 py-3.5 cursor-pointer ${
                  i < ORDERS.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.7rem] font-extrabold shrink-0"
                  style={{
                    background: o.tintBg,
                    border: `1px solid ${o.tintBorder}`,
                    color: o.tintColor,
                  }}
                >
                  {o.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.85rem] font-bold text-dark truncate">
                    {o.title}
                  </div>
                  <div className="text-[0.72rem] text-muted truncate">{o.sub}</div>
                  <div
                    className="mt-1.5 h-1 rounded-full overflow-hidden"
                    style={{ background: "var(--color-lg)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${o.progressPct}%`, background: o.progressColor }}
                    />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3 shrink-0">
                  <StatusMiniPill status={o.status} />
                  <span className="text-[0.8rem] text-muted">due {o.due}</span>
                  <span className="font-display font-extrabold text-[0.95rem] text-green">
                    {o.profit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-[1.2rem] font-extrabold text-dark mb-4">
            Recent activity
          </h2>
          <div className="flex flex-col">
            {TIMELINE.map((t, i) => (
              <div
                key={i}
                className="flex gap-3 pb-3.5 relative last:pb-0"
                style={{
                  position: "relative",
                }}
              >
                {i < TIMELINE.length - 1 && (
                  <div
                    className="absolute"
                    style={{
                      left: "8px",
                      top: "18px",
                      bottom: 0,
                      width: "1.5px",
                      background: "var(--color-border)",
                    }}
                  />
                )}
                <div
                  className="w-[18px] h-[18px] rounded-full shrink-0 mt-0.5"
                  style={{
                    background: t.dot,
                    border: "2px solid white",
                    boxShadow: "0 2px 6px rgba(11,31,58,0.12)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[0.85rem] font-bold text-dark">{t.title}</div>
                  <div className="text-[0.72rem] text-muted">{t.sub}</div>
                  <div
                    className="text-[0.68rem] font-semibold mt-0.5"
                    style={{ color: t.dot }}
                  >
                    {t.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, color }) {
  return (
    <div>
      <div
        className="text-[0.68rem] uppercase text-white/40"
        style={{ letterSpacing: "0.1em" }}
      >
        {label}
      </div>
      <div
        className="font-display text-[1.1rem] font-extrabold"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function BentoTile({ children, className = "", style }) {
  return (
    <div
      className={`rounded-[22px] p-5 border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="bg-white rounded-[16px] border border-border p-5 shadow-sm">
      {children}
    </div>
  );
}

function FilterPill({ active, children }) {
  return (
    <button
      className={`rounded-full px-3.5 py-1 text-[0.72rem] font-semibold transition-colors ${
        active ? "bg-navy text-white" : "bg-off text-body hover:bg-lg"
      }`}
    >
      {children}
    </button>
  );
}

const MINI_PILLS = {
  in_progress: { label: "● In Progress", bg: "rgba(0,184,169,0.12)",  color: "var(--color-teal)", border: "rgba(0,184,169,0.22)" },
  in_review:   { label: "● In Review",   bg: "rgba(245,158,11,0.12)", color: "var(--color-amber)", border: "rgba(245,158,11,0.25)" },
  delivered:   { label: "● Delivered",   bg: "rgba(244,63,94,0.1)",   color: "#f43f5e",            border: "rgba(244,63,94,0.2)" },
};

function StatusMiniPill({ status }) {
  const p = MINI_PILLS[status] ?? MINI_PILLS.in_progress;
  return (
    <span
      className="px-2.5 py-[3px] rounded-full text-[0.68rem] font-bold whitespace-nowrap"
      style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}
    >
      {p.label}
    </span>
  );
}
