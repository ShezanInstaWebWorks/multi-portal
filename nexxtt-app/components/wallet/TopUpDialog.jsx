"use client";

import { useEffect, useState } from "react";
import { X, CreditCard } from "lucide-react";
import { useToast } from "@/components/shared/Toast";

// Demo / test top-up dialog. Clicking a quick-amount chip credits the
// viewer's wallet instantly via /api/wallet/instant-topup — no Stripe
// round-trip yet (re-add the Stripe path when the webhook is wired up).
export function TopUpDialog({ open, onClose, onSuccess }) {
  const [amount, setAmount] = useState("50");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) {
      setAmount("50");
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, busy]);

  async function topUp(dollars) {
    const cents = Math.round(Number(dollars) * 100);
    if (!Number.isFinite(cents) || cents < 100) {
      toast.error("Minimum top-up is $1.00");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/wallet/instant-topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: cents }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(payload.error ?? `Top-up failed (${res.status})`);
      return;
    }
    onSuccess();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
      <div className="bg-white rounded-[16px] shadow-[0_12px_40px_rgba(11,31,58,0.25)] max-w-[440px] w-full overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-teal" />
            <div className="font-display font-extrabold text-dark">Top up wallet</div>
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
            <div
              className="text-[0.72rem] font-bold uppercase text-muted mb-2"
              style={{ letterSpacing: "0.08em" }}
            >
              Quick top-up — one click
            </div>
            <div className="flex flex-wrap gap-2">
              {[50, 100, 250, 500, 1000].map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={busy}
                  onClick={() => topUp(v)}
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
              <span
                className="text-[0.72rem] font-bold uppercase text-muted"
                style={{ letterSpacing: "0.08em" }}
              >
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
                  className="input flex-1"
                  placeholder="Enter amount"
                  disabled={busy}
                />
                <button
                  type="button"
                  disabled={busy || !(Number(amount) >= 1)}
                  onClick={() => topUp(amount)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[0.85rem] font-semibold text-white disabled:opacity-40"
                  style={{ background: "var(--color-teal)" }}
                >
                  {busy ? "Adding…" : "Top up"}
                </button>
              </div>
            </label>
          </div>

          <p className="text-[0.72rem] text-muted text-center">
            Demo mode — funds credit instantly. Real card payments via Stripe will be wired up once the webhook is configured.
          </p>
        </div>
      </div>
    </div>
  );
}
