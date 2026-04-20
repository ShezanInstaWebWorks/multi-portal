"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Mail, Download } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCents } from "@/lib/money";

const TABS = [
  { key: "all",      label: "All" },
  { key: "active",   label: "Portal Active",  match: (c) => c.portal_status === "active" },
  { key: "invited",  label: "Pending Invite", match: (c) => c.portal_status === "invited" },
  { key: "no_access", label: "No Access",     match: (c) => c.portal_status === "no_access" },
];

export function ClientList({ clients }) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c = { all: clients.length };
    for (const t of TABS) {
      if (t.key === "all") continue;
      c[t.key] = clients.filter(t.match).length;
    }
    return c;
  }, [clients]);

  const stats = useMemo(() => {
    const monthAgo = Date.now() - 30 * 86400000;
    return {
      total: clients.length,
      active: counts.active ?? 0,
      invited: counts.invited ?? 0,
      no_access: counts.no_access ?? 0,
      newThisMonth: clients.filter((c) => new Date(c.created_at).getTime() >= monthAgo).length,
    };
  }, [clients, counts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      const t = TABS.find((x) => x.key === tab);
      if (t?.match && !t.match(c)) return false;
      if (!q) return true;
      return (
        c.business_name.toLowerCase().includes(q) ||
        (c.contact_name ?? "").toLowerCase().includes(q) ||
        (c.contact_email ?? "").toLowerCase().includes(q) ||
        (c.industry ?? "").toLowerCase().includes(q)
      );
    });
  }, [clients, tab, query]);

  return (
    <div>
      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Clients"   value={stats.total}    accent="var(--color-dark)"
                  sub={stats.newThisMonth > 0 ? `↑ ${stats.newThisMonth} this month` : null} subColor="var(--color-green)" />
        <StatCard label="Portal Active"   value={stats.active}   accent="var(--color-green)"
                  sub="Clients with login access" />
        <StatCard label="Invite Pending"  value={stats.invited}  accent="var(--color-amber)"
                  sub="Awaiting client sign-up" />
        <StatCard label="No Portal Access" value={stats.no_access} accent="var(--color-muted)"
                  sub="Can invite anytime" />
      </div>

      {/* Filter row */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div
          className="flex gap-0.5 rounded-[10px] p-[3px] border border-border flex-wrap"
          style={{ background: "var(--color-lg)" }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-[7px] px-3 py-1.5 text-[0.78rem] font-semibold transition-all ${
                  active
                    ? "bg-white text-navy shadow-sm"
                    : "text-muted hover:text-dark"
                }`}
              >
                {t.label}{" "}
                <span className={active ? "opacity-80" : "opacity-50"}>
                  ({counts[t.key] ?? 0})
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-border rounded-[10px] px-3 py-[7px] shadow-sm w-[220px]">
            <Search className="w-3.5 h-3.5 text-muted" strokeWidth={2.5} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients…"
              className="flex-1 outline-none text-[0.85rem] bg-transparent"
            />
          </div>
          <button
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[10px] bg-white border border-border text-sm font-semibold text-body hover:border-navy hover:shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <Link
            href="/agency/clients/invite"
            className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[10px] text-sm font-semibold text-white"
            style={{
              background: "var(--color-teal)",
              boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
            }}
          >
            <Mail className="w-3.5 h-3.5" />
            Invite
          </Link>
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="hidden lg:block bg-white border border-border rounded-[16px] overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-off">
              {["Client", "Industry", "Portal Status", "Portal URL", "Jobs", "Billed", "Last Order", "Actions"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[0.72rem] font-bold text-muted uppercase"
                  style={{ letterSpacing: "0.08em" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <ClientRow key={c.id} client={c} isLast={i === filtered.length - 1} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden flex flex-col gap-2.5">
        {filtered.map((c) => (
          <MobileClientCard key={c.id} client={c} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-sm text-muted">
          No clients match the current filter.
        </div>
      )}

      {/* Quick-add strip */}
      <div
        className="mt-6 rounded-[16px] p-5 bg-white flex items-center gap-4 flex-wrap"
        style={{ border: "1.5px dashed var(--color-border)" }}
      >
        <div className="text-[1.4rem]">✉️</div>
        <div className="flex-1 min-w-[200px]">
          <div className="font-bold text-dark text-[0.88rem]">
            Invite a new client to their portal
          </div>
          <div className="text-[0.78rem] text-muted">
            They&apos;ll receive a branded email from your agency and can set up
            their account in minutes.
          </div>
        </div>
        <Link
          href="/agency/clients/invite"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-semibold text-white"
          style={{
            background: "var(--color-teal)",
            boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
          }}
        >
          Start Invite Flow →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, subColor, accent }) {
  return (
    <div className="relative bg-white border border-border rounded-xl p-5 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: accent }}
      />
      <div
        className="text-[11px] font-bold text-muted uppercase mb-2"
        style={{ letterSpacing: "0.08em" }}
      >
        {label}
      </div>
      <div
        className="font-display text-[1.9rem] font-extrabold leading-none"
        style={{ color: accent }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[0.78rem] mt-1.5"
          style={{ color: subColor ?? "var(--color-muted)" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function initialsOf(name) {
  return (name ?? "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_STYLE_BY_STATUS = {
  active:    { bg: "var(--color-teal-bg)",         border: "var(--color-teal-bdr)",        color: "var(--color-teal)"  },
  invited:   { bg: "rgba(245,158,11,0.1)",          border: "rgba(245,158,11,0.2)",          color: "var(--color-amber)" },
  no_access: { bg: "var(--color-lg)",                border: "var(--color-border)",           color: "var(--color-muted)" },
};

function ClientRow({ client, isLast }) {
  const a = AVATAR_STYLE_BY_STATUS[client.portal_status] ?? AVATAR_STYLE_BY_STATUS.no_access;
  const rowBg =
    client.portal_status === "invited" ? "rgba(245,158,11,0.03)" : undefined;

  return (
    <tr
      className={`hover:bg-teal-pale transition-colors ${isLast ? "" : "border-b border-border"}`}
      style={rowBg ? { background: rowBg } : undefined}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[0.75rem] font-extrabold flex-shrink-0"
            style={{ background: a.bg, border: `1px solid ${a.border}`, color: a.color }}
          >
            {initialsOf(client.business_name)}
          </div>
          <div>
            <div className="font-semibold text-dark">{client.business_name}</div>
            <div className="text-[0.75rem] text-muted">
              {client.contact_name} · {client.contact_email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-body">{client.industry ?? "—"}</td>
      <td className="px-4 py-3">
        <StatusBadge status={client.portal_status} />
        <div className="text-[0.7rem] text-muted mt-1">
          {portalStatusDetail(client)}
        </div>
      </td>
      <td className="px-4 py-3 text-[0.78rem]">
        {client.portal_status === "active" ? (
          <span className="text-teal font-semibold">
            /{client.portal_slug}
          </span>
        ) : client.portal_status === "invited" ? (
          <span className="text-muted">Link sent to email</span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-body">{client.stats.count}</td>
      <td className="px-4 py-3 text-body">{formatCents(client.stats.billedCents)}</td>
      <td className="px-4 py-3 text-body text-[0.82rem]">
        {client.stats.lastAt
          ? new Date(client.stats.lastAt).toLocaleDateString("en-AU", {
              day: "2-digit",
              month: "short",
            })
          : "—"}
      </td>
      <td className="px-4 py-3">
        <ClientActions client={client} />
      </td>
    </tr>
  );
}

function ClientActions({ client }) {
  const common =
    "px-2.5 py-1 rounded-md text-[0.72rem] font-semibold bg-off text-body hover:bg-lg transition-colors";
  if (client.portal_status === "invited") {
    return (
      <div className="flex gap-1.5 flex-wrap">
        <button className={common}>Resend</button>
        <button className={common}>Copy Link</button>
        <Link href="/agency/orders/new" className={common}>
          New Order
        </Link>
      </div>
    );
  }
  if (client.portal_status === "no_access") {
    return (
      <div className="flex gap-1.5 flex-wrap">
        <Link
          href={`/agency/clients/invite?clientId=${client.id}`}
          className="px-2.5 py-1 rounded-md text-[0.72rem] font-semibold text-white"
          style={{ background: "var(--color-teal)" }}
        >
          ✉️ Invite
        </Link>
        <Link href="/agency/orders/new" className={common}>
          New Order
        </Link>
      </div>
    );
  }
  return (
    <div className="flex gap-1.5 flex-wrap">
      <Link href={`/portal/preview/${client.portal_slug}`} className={common}>
        View Portal
      </Link>
      <Link href="/agency/orders/new" className={common}>
        New Order
      </Link>
    </div>
  );
}

function MobileClientCard({ client }) {
  const a = AVATAR_STYLE_BY_STATUS[client.portal_status] ?? AVATAR_STYLE_BY_STATUS.no_access;
  return (
    <div className="bg-white border border-border rounded-[12px] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[0.75rem] font-extrabold flex-shrink-0"
          style={{ background: a.bg, border: `1px solid ${a.border}`, color: a.color }}
        >
          {initialsOf(client.business_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-dark truncate">
            {client.business_name}
          </div>
          <div className="text-[0.75rem] text-muted truncate">
            {client.contact_name}
          </div>
          <div className="text-[0.7rem] text-muted truncate">
            {client.contact_email}
          </div>
        </div>
        <StatusBadge status={client.portal_status} />
      </div>
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border text-[0.78rem] text-muted">
        <span>{client.industry ?? "—"}</span>
        <span>
          {client.stats.count} job{client.stats.count === 1 ? "" : "s"} ·{" "}
          {formatCents(client.stats.billedCents)}
        </span>
      </div>
      <div className="mt-3">
        <ClientActions client={client} />
      </div>
    </div>
  );
}

function portalStatusDetail(c) {
  if (c.portal_status === "active") {
    if (c.portal_activated_at) {
      const d = new Date(c.portal_activated_at);
      return `Activated ${d.toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}`;
    }
    return "Portal active";
  }
  if (c.portal_status === "invited" && c.invite_expires_at) {
    const d = new Date(c.invite_expires_at);
    return `Expires ${d.toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}`;
  }
  if (c.portal_status === "no_access") return "Not yet invited";
  return "";
}
