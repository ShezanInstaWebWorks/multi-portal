"use client";

import { useState } from "react";
import { useToast } from "@/components/shared/Toast";

// Admin-only mini-tool for crediting (or debiting) a client wallet. Used from
// /admin/requests to top up a test/demo account without round-tripping to the
// Stripe dashboard. Calls /api/wallet/adjust which writes a `kind=adjustment`
// row to wallet_transactions.
//
// `wallets` is a flat list of selectable owners:
//   { value: "client:<uuid>" | "direct:<uuid>", label: string }
export function AdminWalletAdjustPanel({ wallets = [] }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("100");
  const [note,   setNote]   = useState("");
  const [busy,   setBusy]   = useState(false);

  if (wallets.length === 0) return null;

  async function submit(e) {
    e?.preventDefault?.();
    const cents = Math.round(Number(amount) * 100);
    if (!target) { toast.error("Pick a wallet"); return; }
    if (!Number.isFinite(cents) || cents === 0) { toast.error("Amount must be non-zero"); return; }

    const [kind, id] = target.split(":");
    const body = {
      amountCents: cents,
      description: note.trim() || (cents > 0 ? "Manual top-up by admin" : "Manual debit by admin"),
    };
    if (kind === "client") body.clientId = id;
    else if (kind === "direct") body.directUserId = id;
    else { toast.error("Bad target"); return; }

    setBusy(true);
    const res = await fetch("/api/wallet/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast.error(payload.error ?? `Adjust failed (${res.status})`); return; }
    toast.success(cents > 0 ? `Credited ${formatAud(cents)}` : `Debited ${formatAud(-cents)}`);
    setOpen(false);
    setAmount("100");
    setNote("");
  }

  return (
    <section
      className="bg-white border border-border rounded-[12px] p-4 sm:p-5 shadow-sm"
      style={{ borderLeft: "4px solid var(--color-adm, #7c3aed)" }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-display font-extrabold text-dark text-[0.95rem]">
            🛡 Wallet adjustments
          </div>
          <p className="text-[0.78rem] text-muted mt-0.5">
            Manually credit or debit any client's prepaid wallet. Useful for refunds, demos, or
            comping a top-up while testing.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[0.82rem] font-semibold text-white"
            style={{ background: "var(--color-adm, #7c3aed)" }}
          >
            + Adjust wallet
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 grid grid-cols-1 sm:grid-cols-[2fr_1fr_2fr_auto] gap-2 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-bold uppercase text-muted" style={{ letterSpacing: "0.08em" }}>
              Wallet
            </span>
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">— Pick a wallet —</option>
              {wallets.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-bold uppercase text-muted" style={{ letterSpacing: "0.08em" }}>
              Amount AUD (negative to debit)
            </span>
            <input
              className="input"
              type="number"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-bold uppercase text-muted" style={{ letterSpacing: "0.08em" }}>
              Note (optional)
            </span>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Demo top-up"
            />
          </label>

          <div className="flex items-center gap-1.5">
            <button
              type="submit"
              disabled={busy || !target}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[0.82rem] font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--color-adm, #7c3aed)" }}
            >
              {busy ? "Saving…" : "Apply"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setAmount("100"); setNote(""); }}
              className="text-[0.78rem] text-muted hover:text-dark underline px-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function formatAud(cents) {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
