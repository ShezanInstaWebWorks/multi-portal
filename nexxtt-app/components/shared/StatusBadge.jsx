const STATUS = {
  in_progress:        { label: "In Progress",  cls: "bg-teal/10 text-teal border border-teal/20" },
  in_review:          { label: "In Review",    cls: "bg-amber/10 text-amber border border-amber/20" },
  brief_pending:      { label: "Brief Pending", cls: "bg-navy/10 text-navy border border-navy/20" },
  delivered:          { label: "Delivered ✓",  cls: "bg-green/10 text-green border border-green/20" },
  revision_requested: { label: "Revision",     cls: "bg-blue/10 text-blue border border-blue/20" },
  disputed:           { label: "⚑ Disputed",   cls: "bg-red/10 text-red border border-red/20" },
  active:             { label: "● Active",     cls: "bg-green/10 text-green border border-green/20" },
  invited:            { label: "⏳ Invited",    cls: "bg-amber/10 text-amber border border-amber/20" },
  no_access:          { label: "○ No Access",  cls: "bg-lg text-muted border border-border" },
  pending:            { label: "Pending",       cls: "bg-amber/10 text-amber border border-amber/20" },
  suspended:          { label: "Suspended",     cls: "bg-red/10 text-red border border-red/20" },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-lg text-muted" };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
