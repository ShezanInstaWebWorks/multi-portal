"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";

const STATUS_LABEL = {
  pending_counterparty:   "Awaiting reply",
  counter_offered:        "Counter-offer",
  accepted:               "Accepted",
  rejected:               "Rejected",
  pending_admin_approval: "Awaiting admin approval",
  sent_to_admin:          "Sent to admin",
  converted:              "Converted to job",
  cancelled:              "Cancelled",
};

const STATUS_STYLE = {
  pending_counterparty:   { bg: "rgba(245,158,11,0.1)",  color: "var(--color-amber)" },
  counter_offered:        { bg: "rgba(59,130,246,0.1)",  color: "var(--color-blue)"  },
  accepted:               { bg: "rgba(16,185,129,0.1)",  color: "var(--color-green)" },
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
  const [counterAmount, setCounterAmount] = useState("");
  const [counterDate,   setCounterDate]   = useState(request.proposed_delivery_date ?? "");
  const [preferredDate, setPreferredDate] = useState("");
  const [adminDate,     setAdminDate]     = useState(request.proposed_delivery_date ?? "");
  const [convertStatus, setConvertStatus] = useState("brief_pending");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const isAgencyClientInitiated =
    request.client_id && request.initiator_role === "agency_client";
  const isAgencyInitiated =
    request.client_id && request.initiator_role === "agency";

  const service = services.find((s) => s.id === request.service_id);
  const style = STATUS_STYLE[request.status] ?? STATUS_STYLE.pending_counterparty;

  const liveAmount =
    request.final_amount_cents ?? request.counter_amount_cents ?? request.proposed_amount_cents;

  async function send(action, extra = {}) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/project-requests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(payload.error ?? `Request failed (${res.status})`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="bg-white border border-border rounded-[12px] p-4 sm:p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[1rem] font-extrabold text-dark">{request.title}</div>
          <div className="text-[0.75rem] text-muted">
            {service?.name ?? "—"}
            {" · "}
            Filed by {ROLE_LABEL[request.initiator_role]}
            {" · "}
            {new Date(request.created_at).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}
          </div>
        </div>
        <span
          className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[0.7rem] font-bold"
          style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}40` }}
        >
          {STATUS_LABEL[request.status] ?? request.status}
        </span>
      </div>

      {request.description && (
        <div className="text-[0.85rem] text-body leading-relaxed whitespace-pre-wrap">
          {request.description}
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
                placeholder="AUD"
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
                  if (!Number.isFinite(n) || n < 0) return;
                  send("counter", {
                    amountCents: Math.round(n * 100),
                    ...(counterDate ? { proposedDeliveryDate: counterDate } : {}),
                  });
                }}
                disabled={busy || !counterAmount}
                className="px-3 py-1.5 rounded-[8px] text-[0.8rem] font-semibold bg-white border border-border hover:border-navy disabled:opacity-40"
              >
                Counter{viewerRole === "agency" ? " (propose date)" : ""}
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
                onClick={() => send("accept", preferredDate ? { preferredDeliveryDate: preferredDate } : {})}
                style={{ background: "var(--color-green)", color: "white" }}
              >
                {isAgencyClientInitiated && viewerRole === "agency_client"
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
                Approve & set delivery
              </Btn>
              <span className="text-[0.72rem] text-muted">Admin confirmation required</span>
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
                Convert to job
              </Btn>
            </div>
          )}

          {(actions.includes("reject") || actions.includes("cancel")) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {actions.includes("reject") && (
                <Btn busy={busy} onClick={() => send("reject")} style={{ background: "white", color: "var(--color-red)", border: "1px solid var(--color-red)" }}>
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

      {request.status === "converted" && (request.converted_to_project_id || request.converted_to_job_id) && (
        <ConvertedJobLink request={request} viewerRole={viewerRole} portalProjectBaseHref={portalProjectBaseHref} />
      )}

      {error && (
        <div
          className="rounded-[8px] px-3 py-2 text-[0.82rem]"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "var(--color-red)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
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
