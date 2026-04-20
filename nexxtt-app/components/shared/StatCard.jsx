export function StatCard({ label, value, delta, deltaUp, accent }) {
  return (
    <div className="relative bg-white border border-border rounded-xl p-5 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default group">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal to-teal-l opacity-0 group-hover:opacity-100 transition-opacity" />
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: accent }}
        />
      )}
      <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-2">
        {label}
      </div>
      <div className="font-display text-3xl font-extrabold text-dark leading-none">
        {value}
      </div>
      {delta && (
        <div
          className={`text-xs mt-1.5 flex items-center gap-1 ${
            deltaUp ? "text-green" : "text-muted"
          }`}
        >
          {delta}
        </div>
      )}
    </div>
  );
}
