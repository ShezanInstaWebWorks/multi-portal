export function MobileTableCard({
  title,
  subtitle,
  status,
  value,
  meta,
  onClick,
  actions,
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-border rounded-[10px] p-4 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-all duration-150 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-semibold text-dark text-sm">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted mt-0.5">{subtitle}</div>
          )}
        </div>
        {value && (
          <div className="font-display font-bold text-teal text-base whitespace-nowrap">
            {value}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {status}
        {meta && <span className="text-xs text-muted">{meta}</span>}
      </div>
      {actions && <div className="flex gap-2 mt-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}
