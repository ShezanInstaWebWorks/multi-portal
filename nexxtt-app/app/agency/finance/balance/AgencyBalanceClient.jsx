"use client";

import { useState } from "react";
import { ArrowLeft, Wallet, Plus, TrendingUp, TrendingDown, CreditCard, DollarSign, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";
import { useToast } from "@/components/shared/Toast";

const TX_TYPE_CONFIG = {
  credit: { icon: TrendingUp, color: "text-green", bg: "rgba(16,185,129,0.1)", label: "Top-up" },
  debit: { icon: TrendingDown, color: "text-red", bg: "rgba(239,68,68,0.1)", label: "Order charge" },
};

export function AgencyBalancePage({ agency, transactions }) {
  const router = useRouter();
  const toast = useToast();
  const [balance, setBalance] = useState(agency?.balance_cents ?? 0);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [localTx, setLocalTx] = useState(transactions ?? []);

  async function handleTopUp(amountCents) {
    const res = await fetch("/api/agency/balance-topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents,
        description: "Balance top-up",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? `Top-up failed (${res.status})`);
      return false;
    }
    setBalance(data.newBalance);
    setLocalTx((prev) => [
      {
        id: `new-${Date.now()}`,
        type: "credit",
        amount_cents: amountCents,
        balance_after_cents: data.newBalance,
        description: "Balance top-up",
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    return true;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-7 max-w-[1200px] mx-auto w-full">
      <Link
        href="/agency/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to dashboard
      </Link>

      <div className="flex items-center gap-3 mb-7">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "var(--color-teal-pale)", color: "var(--color-teal)" }}
        >
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-extrabold text-[1.4rem] text-dark">Agency Balance</h1>
          <p className="text-[0.82rem] text-muted">{agency?.business_name ?? "Agency"}</p>
        </div>
      </div>

      {/* Balance card */}
      <div className="bg-navy rounded-[16px] p-6 text-white shadow-lg mb-7">
        <div className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-white/50 mb-2">
          Available balance
        </div>
        <div className="text-[2.2rem] font-extrabold leading-none mb-4">{formatCents(balance)}</div>
        <button
          onClick={() => setTopUpOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-[10px] text-sm font-extrabold text-white transition-all hover:-translate-y-px"
          style={{
            background: "var(--color-teal)",
            boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
          }}
        >
          <Plus className="w-4 h-4" />
          Add Money
        </button>
      </div>

      {/* Transactions */}
      <div className="bg-white border border-border rounded-[14px] overflow-hidden">
        <div className="px-5 py-3 border-b border-border" style={{ background: "var(--color-off)" }}>
          <div className="text-[0.78rem] font-semibold text-dark">Transaction History</div>
        </div>
        {localTx.length === 0 ? (
          <div className="text-[0.82rem] text-muted text-center py-8">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {localTx.map((tx) => {
              const config = TX_TYPE_CONFIG[tx.type] ?? TX_TYPE_CONFIG.debit;
              const Icon = config.icon;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-4">
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ background: config.bg }}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.82rem] font-semibold text-dark truncate">
                      {tx.description ?? config.label}
                    </div>
                    <div className="text-[0.7rem] text-muted">
                      {new Date(tx.created_at).toLocaleString("en-AU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-display font-extrabold text-[0.95rem] ${config.color}`}>
                      {tx.type === "credit" ? "+" : "−"}{formatCents(Math.abs(tx.amount_cents))}
                    </div>
                    <div className="text-[0.68rem] text-muted">
                      Bal: {formatCents(tx.balance_after_cents ?? 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top-up dialog */}
      <AgencyTopUpDialog
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onTopUp={async (cents) => {
          const ok = await handleTopUp(cents);
          if (ok) {
            toast.success("Balance updated successfully");
            setTopUpOpen(false);
          }
        }}
      />
    </div>
  );
}

function AgencyTopUpDialog({ open, onClose, onTopUp }) {
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function handleTopUp(dollars) {
    const cents = Math.round(Number(dollars) * 100);
    if (!Number.isFinite(cents) || cents < 100) {
      return;
    }
    setBusy(true);
    await onTopUp(cents);
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
      <div className="bg-white rounded-[16px] shadow-[0_12px_40px_rgba(11,31,58,0.25)] max-w-[440px] w-full overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-teal" />
            <div className="font-display font-extrabold text-dark">Add money to balance</div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-[8px] text-muted hover:text-dark hover:bg-off disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <div className="text-[0.72rem] font-bold uppercase text-muted mb-2" style={{ letterSpacing: "0.08em" }}>
              Quick amounts
            </div>
            <div className="flex flex-wrap gap-2">
              {[50, 100, 250, 500, 1000].map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={busy}
                  onClick={() => handleTopUp(v)}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-[10px] text-[0.85rem] font-semibold text-white disabled:opacity-40 hover:-translate-y-px transition-transform"
                  style={{ background: "var(--color-teal)", boxShadow: "0 2px 10px rgba(0,184,169,0.25)" }}
                >
                  + ${v}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.72rem] font-bold uppercase text-muted" style={{ letterSpacing: "0.08em" }}>
                Custom amount (AUD)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[0.95rem] font-semibold text-muted">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-[8px] text-[0.9rem] font-semibold outline-none bg-white text-dark focus:border-teal"
                  placeholder="Enter amount"
                  disabled={busy}
                />
                <button
                  type="button"
                  disabled={busy || !(Number(amount) >= 1)}
                  onClick={() => handleTopUp(amount)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[0.85rem] font-semibold text-white disabled:opacity-40"
                  style={{ background: "var(--color-teal)" }}
                >
                  {busy ? "Adding…" : "Add"}
                </button>
              </div>
            </label>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-3 p-3 rounded-[10px]" style={{ background: "var(--color-off)" }}>
              <CreditCard className="w-5 h-5 text-muted shrink-0" />
              <div className="text-[0.78rem] text-muted">
                Demo mode — funds are added instantly. Payment gateway integration coming soon.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
