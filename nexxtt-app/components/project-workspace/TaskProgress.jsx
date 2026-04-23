// Tiny task-progress badge: "5/12 done" with a thin bar. Server-rendered.
export function TaskProgress({ tasks = [] }) {
  if (!tasks.length) return null;
  const total = tasks.length;
  const done  = tasks.filter((t) => t.status === "done").length;
  const pct   = Math.round((done / total) * 100);

  return (
    <div className="inline-flex flex-col gap-1 min-w-[140px]">
      <div className="flex items-center justify-between gap-2 text-[0.7rem] uppercase font-bold text-muted" style={{ letterSpacing: "0.08em" }}>
        <span>Tasks</span>
        <span className="text-dark">{done}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-lg)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? "var(--color-green)"
              : "linear-gradient(90deg, var(--color-teal), var(--color-teal-l, var(--color-teal)))",
          }}
        />
      </div>
    </div>
  );
}
