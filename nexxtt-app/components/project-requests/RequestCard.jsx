"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Paperclip, Download, FileText } from "lucide-react";
import { formatCents } from "@/lib/money";
import { useToast } from "@/components/shared/Toast";

const STATUS_LABEL = {
  pending_agency_review:  "Awaiting agency review",
  pending_counterparty:   "Awaiting reply",
  counter_offered:        "Counter-offer",
  accepted:               "Accepted",
  rejected_by_agency:     "Declined by agency",
  rejected:               "Rejected",
  pending_admin_approval: "Awaiting admin approval",
  sent_to_admin:          "Sent to admin",
  converted:              "Converted to job",
  cancelled:              "Cancelled",
};

const STATUS_STYLE = {
  pending_agency_review:  { bg: "rgba(245,158,11,0.1)",  color: "var(--color-amber)" },
  pending_counterparty:   { bg: "rgba(245,158,11,0.1)",  color: "var(--color-amber)" },
  counter_offered:        { bg: "rgba(59,130,246,0.1)",  color: "var(--color-blue)"  },
  accepted:               { bg: "rgba(16,185,129,0.1)",  color: "var(--color-green)" },
  rejected_by_agency:     { bg: "rgba(239,68,68,0.08)",  color: "var(--color-red)"   },
  rejected:               { bg: "rgba(239,68,68,0.08)",  color: "var(--color-red)"   },
  pending_admin_approval: { bg: "rgba(124,58,237,0.08)", color: "var(--color-adm)"   },
  sent_to_admin:          { bg: "rgba(124,58,237,0.1)",  color: "var(--color-adm)"   },
  converted:              { bg: "rgba(16,185,129,0.1)",  color: "var(--color-green)" },
  cancelled:              { bg: "rgba(107,122,146,0.1)", color: "var(--color-muted)" },
};

// Displays a request + the action buttons available to the current viewer.
// `actions` is an array of strings: 'counter','accept','reject','cancel','send_to_admin','convert'.
// For agency_client viewers in the white-label portal, pass `portalProjectBaseHref`
// (e.g. "/portal/<agencySlug>/<clientSlug>/projects") so the converted-project
// link can route inside their portal.
export function RequestCard({ request, actions = [], viewerRole, services = [], portalProjectBaseHref = null }) {
  const router = useRouter();
  const toast = useToast();
  const [counterAmount, setCounterAmount] = useState("");
  const [counterDate,   setCounterDate]   = useState(request.proposed_delivery_date ?? "");
  const [preferredDate, setPreferredDate] = useState("");
  const [adminDate,     setAdminDate]     = useState(request.proposed_delivery_date ?? "");
  const [convertStatus, setConvertStatus] = useState("brief_pending");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAgencyClientInitiated =
    request.client_id && request.initiator_role === "agency_client";
  const isAgencyInitiated =
    request.client_id && request.initiator_role === "agency";
  const hasPendingCounter = request.status === "counter_offered";

  // Resolve the bundle: prefer service_ids (multi), fall back to legacy single.
  const bundleIds = (request.service_ids?.length ? request.service_ids : (request.service_id ? [request.service_id] : []));
  const bundleServices = bundleIds
    .map((sid) => services.find((s) => s.id === sid))
    .filter(Boolean);
  const service = bundleServices[0] ?? null; // legacy single-service callers
  const style = STATUS_STYLE[request.status] ?? STATUS_STYLE.pending_counterparty;

  const liveAmount =
    request.final_amount_cents ?? request.counter_amount_cents ?? request.proposed_amount_cents;

  async function send(action, extra = {}) {
    setBusy(true);
    const res = await fetch(`/api/project-requests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(payload.error ?? `Request failed (${res.status})`);
      return;
    }
    const msg = ACTION_SUCCESS[action] ?? "Done";
    toast.success(msg);
    router.refresh();
  }

  return (
    <div className="bg-white border border-border rounded-[12px] p-4 sm:p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[1rem] font-extrabold text-dark">{request.title}</div>
          <div className="text-[0.75rem] text-muted">
            {bundleServices.length === 0 && "—"}
            {bundleServices.length === 1 && bundleServices[0].name}
            {bundleServices.length > 1 && `${bundleServices.length} services`}
            {" · "}
            Filed by {ROLE_LABEL[request.initiator_role]}
            {" · "}
            {new Date(request.created_at).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}
          </div>
          {bundleServices.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {bundleServices.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[0.7rem] font-semibold bg-off border border-border text-body whitespace-nowrap"
                >
                  <span>{s.icon ?? "•"}</span>
                  <span>{s.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <span
          className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[0.7rem] font-bold"
          style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}40` }}
        >
          {STATUS_LABEL[request.status] ?? request.status}
        </span>
      </div>

      {Array.isArray(request.attachments) && request.attachments.length > 0 && (
        <RequestAttachments requestId={request.id} attachments={request.attachments} />
      )}

      {request.description && (
        <div className="text-[0.85rem] text-body leading-relaxed whitespace-pre-wrap">
          {request.description}
        </div>
      )}

      {request.rejection_reason && (
        <div className="text-[0.85rem] leading-relaxed whitespace-pre-wrap p-3 rounded-[8px] bg-red-50 border border-red-100">
          <div className="text-[0.7rem] font-bold text-red-600 uppercase mb-1">Rejection Reason</div>
          <div className="text-red-800">{request.rejection_reason}</div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-border">
        <AmountCell label="Proposed" cents={request.proposed_amount_cents} />
        <AmountCell label="Counter"  cents={request.counter_amount_cents} />
        <AmountCell label="Final"    cents={request.final_amount_cents ?? (["accepted","sent_to_admin","pending_admin_approval"].includes(request.status) ? liveAmount : null)} highlight />
      </div>

      {(request.proposed_delivery_date || request.preferred_delivery_date) && (
        <div className="flex items-center gap-4 flex-wrap text-[0.78rem] border-t border-border pt-2">
          {request.proposed_delivery_date && (
            <div>
              <span className="text-muted mr-1.5">Proposed delivery:</span>
              <strong className="text-dark">{request.proposed_delivery_date}</strong>
            </div>
          )}
          {request.preferred_delivery_date && (
            <div>
              <span className="text-muted mr-1.5">Client preferred:</span>
              <strong className="text-dark">{request.preferred_delivery_date}</strong>
            </div>
          )}
        </div>
      )}

      {actions.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          {actions.includes("counter") && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="number"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="Amount (AUD)"
                className="input max-w-[120px] py-1.5"
                style={{ padding: "0.4rem 0.6rem" }}
              />
              <input
                type="date"
                value={counterDate}
                onChange={(e) => setCounterDate(e.target.value)}
                className="input max-w-[160px] py-1.5"
                style={{ padding: "0.4rem 0.6rem" }}
                title="Proposed delivery date"
              />
              <button
                onClick={() => {
                  const n = Number(counterAmount);
                  const hasAmount = Number.isFinite(n) && n > 0;
                  const hasDate = counterDate && counterDate.length > 0;
                  if (!hasAmount && !hasDate) return;
                  send("counter", {
                    ...(hasAmount ? { amountCents: Math.round(n * 100) } : {}),
                    ...(hasDate ? { proposedDeliveryDate: counterDate } : {}),
                  });
                }}
                disabled={busy || (!counterAmount && !counterDate)}
                className="px-3 py-1.5 rounded-[8px] text-[0.8rem] font-semibold disabled:opacity-40"
                style={{
                  background: (counterAmount || counterDate) ? "var(--color-teal)" : "white",
                  color: (counterAmount || counterDate) ? "var(--color-navy)" : "var(--color-muted)",
                  border: (counterAmount || counterDate) ? "1px solid var(--color-teal)" : "1px solid var(--color-border)",
                }}
              >
                Counter
              </button>
            </div>
          )}

          {actions.includes("accept") && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {isAgencyInitiated && viewerRole === "agency_client" && (
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="input max-w-[180px] py-1.5"
                  style={{ padding: "0.4rem 0.6rem" }}
                  title="Your preferred delivery deadline (optional)"
                  placeholder="Preferred deadline"
                />
              )}
              <Btn
                busy={busy}
                disabled={hasPendingCounter}
                onClick={() => send("accept", preferredDate ? { preferredDeliveryDate: preferredDate } : {})}
                style={{
                  background: hasPendingCounter ? "rgba(16,185,129,0.5)" : "rgba(4,120,87,0.9)",
                  color: "white",
                }}
              >
                {hasPendingCounter
                  ? "Awaiting client response"
                  : isAgencyClientInitiated && (viewerRole === "agency" || viewerRole === "agency_client")
                    ? "Accept — send for admin approval"
                    : "Accept"}
              </Btn>
              {isAgencyInitiated && viewerRole === "agency_client" && (
                <span className="text-[0.72rem] text-muted">Preferred deadline is optional</span>
              )}
            </div>
          )}

          {actions.includes("admin_approve") && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={adminDate}
                onChange={(e) => setAdminDate(e.target.value)}
                className="input max-w-[180px] py-1.5"
                style={{ padding: "0.4rem 0.6rem" }}
                title="Delivery date (required)"
              />
              <Btn
                busy={busy || !adminDate}
                onClick={() => adminDate && send("admin_approve", { proposedDeliveryDate: adminDate })}
                style={{ background: "var(--color-adm)", color: "white" }}
              >
                Approve & create job
              </Btn>
              <span className="text-[0.72rem] text-muted">Sets the delivery date and converts to a job in one click</span>
            </div>
          )}

          {actions.includes("send_to_admin") && (
            <Btn busy={busy} onClick={() => send("send_to_admin")} style={{ background: "var(--color-navy)", color: "white" }}>
              Send to admin
            </Btn>
          )}

          {actions.includes("convert") && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={convertStatus}
                onChange={(e) => setConvertStatus(e.target.value)}
                className="rounded-[8px] border border-border bg-white text-[0.78rem] px-2 py-1.5"
                title="Initial job status"
              >
                <option value="brief_pending">Start in pipeline (brief pending)</option>
                <option value="in_progress">Mark in progress</option>
                <option value="in_review">Mark in review</option>
                <option value="delivered">Mark delivered</option>
              </select>
              <Btn busy={busy} onClick={() => send("convert", { initialStatus: convertStatus })} style={{ background: "var(--color-teal)", color: "var(--color-navy)" }}>
                {request.status === "accepted" || request.status === "sent_to_admin"
                  ? "Convert to job"
                  : "Accept & convert to job"}
              </Btn>
            </div>
          )}

          {(actions.includes("reject") || actions.includes("cancel")) && (
            <div className="flex flex-col gap-2">
              {showRejectReason && (
                <div className="flex flex-col gap-1.5 p-3 rounded-[8px] bg-red-50 border border-red-100">
                  <label className="text-[0.75rem] font-semibold text-red-700">
                    Reason for rejection (will be sent to client)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    className="input text-[0.85rem] min-h-[60px] resize-none"
                    rows={2}
                  />
                  <div className="flex gap-1.5">
                    <Btn
                      busy={busy}
                      onClick={() => send("reject", { reason: rejectReason })}
                      style={{ background: "var(--color-red)", color: "white" }}
                    >
                      Confirm Reject
                    </Btn>
                    <button
                      onClick={() => { setShowRejectReason(false); setRejectReason(""); }}
                      className="px-3 py-1.5 rounded-[8px] text-[0.8rem] font-semibold text-muted hover:text-dark"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {!showRejectReason && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {actions.includes("reject") && (
                    <Btn busy={busy} onClick={() => setShowRejectReason(true)} style={{ background: "white", color: "var(--color-red)", border: "1px solid var(--color-red)" }}>
                      Reject
                    </Btn>
                  )}
                  {actions.includes("cancel") && (
                    <Btn busy={busy} onClick={() => send("cancel")} style={{ background: "white", color: "var(--color-muted)", border: "1px solid var(--color-border)" }}>
                      Cancel
                    </Btn>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {request.status === "converted" && (request.converted_to_project_id || request.converted_to_job_id) && (
        <ConvertedJobLink request={request} viewerRole={viewerRole} portalProjectBaseHref={portalProjectBaseHref} />
      )}

    </div>
  );
}

const ACTION_SUCCESS = {
  counter:       "Counter-offer sent",
  accept:        "Offer accepted",
  reject:        "Offer rejected",
  cancel:        "Request cancelled",
  send_to_admin: "Sent to admin for review",
  admin_approve: "Approved & job created",
  convert:       "Converted to a job",
};

function RequestAttachments({ requestId, attachments }) {
  const toast = useToast();
  const [busyPath, setBusyPath] = useState(null);

  async function download(att) {
    if (busyPath) return;
    setBusyPath(att.path);
    const res = await fetch(
      `/api/project-requests/${requestId}/attachment?path=${encodeURIComponent(att.path)}`
    );
    setBusyPath(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? `Couldn't get file (${res.status})`);
      return;
    }
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank", "noopener");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="text-[0.65rem] font-bold uppercase text-muted flex items-center gap-1"
        style={{ letterSpacing: "0.1em" }}
      >
        <Paperclip className="w-3 h-3" />
        Reference files ({attachments.length})
      </div>
      <div className="flex flex-col gap-1">
        {attachments.map((a) => (
          <button
            key={a.path}
            type="button"
            onClick={() => download(a)}
            disabled={busyPath === a.path}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] bg-off border border-border hover:border-teal text-left transition-colors disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-muted shrink-0" />
            <span className="text-[0.78rem] text-dark truncate flex-1">{a.name}</span>
            <span className="text-[0.7rem] text-muted whitespace-nowrap">{formatBytes(a.size)}</span>
            <Download className="w-3.5 h-3.5 text-teal shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function formatBytes(n) {
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function ConvertedJobLink({ request, viewerRole, portalProjectBaseHref }) {
  const projectId = request.converted_to_project_id;
  if (!projectId) return null;

  // Project workspace links — preferred when we have the project_id
  const workspaceHref = (() => {
    if (viewerRole === "admin")          return `/admin/projects/${projectId}`;
    if (viewerRole === "agency")         return `/agency/projects/${projectId}`;
    if (viewerRole === "direct_client")  return `/direct/projects/${projectId}`;
    if (viewerRole === "agency_client" && portalProjectBaseHref) {
      return `${portalProjectBaseHref}/${projectId}`;
    }
    return null;
  })();

  if (!workspaceHref) return null;

  return (
    <Link
      href={workspaceHref}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[0.78rem] font-semibold w-fit"
      style={{
        background: "var(--color-teal-pale)",
        color: "var(--color-navy)",
        border: "1px solid var(--color-teal)",
      }}
    >
      → Open project workspace
    </Link>
  );
}

function AmountCell({ label, cents, highlight }) {
  return (
    <div>
      <div className="text-[0.62rem] uppercase text-muted font-bold" style={{ letterSpacing: "0.1em" }}>
        {label}
      </div>
      <div
        className={`font-display text-[0.95rem] font-extrabold ${
          highlight ? "text-teal" : "text-dark"
        }`}
      >
        {cents == null ? "—" : formatCents(cents)}
      </div>
    </div>
  );
}

function Btn({ busy, onClick, children, style }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="px-3 py-1.5 rounded-[8px] text-[0.8rem] font-semibold disabled:opacity-40"
      style={style}
    >
      {children}
    </button>
  );
}

const ROLE_LABEL = {
  agency_client: "client",
  agency: "agency",
  direct_client: "client",
  admin: "admin",
};
