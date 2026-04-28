"use client";

import { useEffect, useState } from "react";
import { Wallet, Plus, RefreshCw, ChevronDown } from "lucide-react";
import { formatCents } from "@/lib/money";
import { useToast } from "@/components/shared/Toast";
import { TopUpDialog } from "./TopUpDialog";

export function WalletCard({ defaultOpen = false }) {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, balanceCents: 0, transactions: [], label: "Your wallet" });
  const [topUpOpen, setTopUpOpen] = useState(defaultOpen);
  const [activityOpen, setActivityOpen] = useState(false);

  async function refresh() {
    setState((s) => ({ ...s, loading: true }));
    const res = await fetch("/api/wallet/balance", { cache: "no-store" });
    if (!res.ok) {
      setState({ loading: false, balanceCents: 0, transactions: [], label: "Your wallet" });
      return;
    }
    const data = await res.json();
    setState({
      loading: false,
      balanceCents: data.balanceCents ?? 0,
      transactions: data.transactions ?? [],
      label: data.label ?? "Your wallet",
    });
  }

  useEffect(() => { refresh(); }, []);

  return (
    <>
      <section className="bg-white border border-border rounded-[12px] px-3.5 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <Wallet className="w-4 h-4 text-teal shrink-0" />
            <div className="font-display text-[1.1rem] font-extrabold text-dark leading-none">
              {state.loading ? "—" : formatCents(state.balanceCents)}
            </div>
            <div className="text-[0.72rem] text-muted truncate">· {state.label}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={refresh}
              className="p-1.5 rounded-[8px] text-muted hover:text-dark hover:bg-off"
              title="Refresh"
              aria-label="Refresh wallet"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[0.78rem] font-semibold text-white"
              style={{ background: "var(--color-teal)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Top up
            </button>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => setActivityOpen((o) => !o)}
            aria-expanded={activityOpen}
            className="w-full flex items-center justify-between gap-3 text-left rounded-[8px] -mx-1 px-1 py-1 hover:bg-off transition-colors"
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[0.68rem] font-bold uppercase text-muted"
                style={{ letterSpacing: "0.1em" }}
              >
                Recent activity
              </span>
              <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[0.68rem] font-bold bg-off text-muted">
                {state.transactions.length}
              </span>
            </div>
            <ChevronDown
              className="w-4 h-4 text-muted transition-transform"
              style={{ transform: activityOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {activityOpen && (
            <div className="mt-2">
              {state.transactions.length === 0 ? (
                <div className="text-[0.82rem] text-muted py-3">No activity yet.</div>
              ) : (
                <ul className="flex flex-col divide-y divide-border max-h-[360px] overflow-y-auto">
                  {state.transactions.map((t) => (
                    <li key={t.id} className="py-2 flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[0.9rem] shrink-0"
                        style={{
                          background: KIND_STYLE[t.kind]?.bg ?? "var(--color-off)",
                          color: KIND_STYLE[t.kind]?.color ?? "var(--color-muted)",
                        }}
                      >
                        {KIND_STYLE[t.kind]?.icon ?? "•"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.85rem] font-semibold text-dark truncate">
                          {t.description || KIND_LABEL[t.kind] || "Transaction"}
                        </div>
                        <div className="text-[0.7rem] text-muted">
                          {new Date(t.created_at).toLocaleString("en-AU", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div
                        className="font-display font-extrabold text-[0.95rem]"
                        style={{ color: t.amount_cents >= 0 ? "var(--color-green)" : "var(--color-dark)" }}
                      >
                        {t.amount_cents >= 0 ? "+" : "−"}{formatCents(Math.abs(t.amount_cents))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      <TopUpDialog
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onSuccess={() => {
          toast.success("Top-up successful");
          setTopUpOpen(false);
          refresh();
        }}
      />
    </>
  );
}

const KIND_LABEL = {
  topup:      "Wallet top-up",
  job_charge: "Job charge",
  refund:     "Refund",
  adjustment: "Adjustment",
};
const KIND_STYLE = {
  topup:      { icon: "＋", bg: "rgba(16,185,129,0.1)",  color: "var(--color-green)" },
  job_charge: { icon: "💼", bg: "rgba(11,31,58,0.08)",   color: "var(--color-dark)"  },
  refund:     { icon: "↩", bg: "rgba(59,130,246,0.1)",  color: "var(--color-blue)"  },
  adjustment: { icon: "✎", bg: "rgba(124,58,237,0.1)",  color: "var(--color-adm)"   },
};
