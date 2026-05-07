import { Clock, Flag, X, Circle, CircleDot } from "lucide-react";

const STATUS = {
  pending_admin_approval: { label: "Pending Approval", icon: Clock, iconCls: "w-3 h-3", cls: "bg-amber/10 text-amber border border-amber/25" },
  brief_pending:          { label: "Brief Pending",       icon: null, cls: "bg-navy/10 text-navy border border-navy/20" },
  in_progress:            { label: "In Progress",         icon: null, cls: "bg-teal/10 text-teal border border-teal/20" },
  agency_review:          { label: "Agency Review",       icon: null, cls: "bg-blue/10 text-blue border border-blue/20" },
  in_review:              { label: "Client Review",       icon: null, cls: "bg-amber/10 text-amber border border-amber/20" },
  delivered:              { label: "Delivered", icon: null, cls: "bg-green/10 text-green border border-green/20" },
  revision_requested:     { label: "Revision",            icon: null, cls: "bg-blue/10 text-blue border border-blue/20" },
  disputed:               { label: "Disputed",          icon: Flag, iconCls: "w-3 h-3", cls: "bg-red/10 text-red border border-red/20" },
  rejected:               { label: "Rejected",          icon: X, iconCls: "w-3 h-3", cls: "bg-red/10 text-red border border-red/20" },
  cancelled:              { label: "Cancelled",            icon: null, cls: "bg-lg text-muted border border-border" },
  active:             { label: "Active",     icon: CircleDot, iconCls: "w-3 h-3", cls: "bg-green/10 text-green border border-green/20" },
  invited:            { label: "Invited",    icon: Clock, iconCls: "w-3 h-3", cls: "bg-amber/10 text-amber border border-amber/20" },
  no_access:          { label: "No Access",  icon: Circle, iconCls: "w-3 h-3", cls: "bg-lg text-muted border border-border" },
  pending:            { label: "Pending",       icon: Clock, iconCls: "w-3 h-3", cls: "bg-amber/10 text-amber border border-amber/20" },
  suspended:          { label: "Suspended",     icon: null, cls: "bg-red/10 text-red border border-red/20" },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-lg text-muted", icon: null };
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${s.cls}`}
    >
      {Icon && <Icon className={s.iconCls} />}
      {s.label}
    </span>
  );
}
