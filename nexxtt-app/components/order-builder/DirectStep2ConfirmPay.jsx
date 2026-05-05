"use client";

import { CreditCard, Wallet, CheckCircle, AlertCircle } from "lucide-react";
import { formatCents } from "@/lib/money";

export function DirectStep2ConfirmPay({
  selectedItems,
  totals,
  paymentMethod,
  setPaymentMethod,
  termsAccepted,
  setTermsAccepted,
  submitError,
  user,
}) {
  if (selectedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "var(--color-off)" }}
        >
          <AlertCircle className="w-8 h-8 text-muted" />
        </div>
        <div className="font-display font-bold text-[1.1rem] text-dark">No services selected</div>
        <div className="text-[0.82rem] text-muted mt-1">Go back and select at least one service package.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-7 items-start">
      {/* Left column */}
      <div>
        {/* User info */}
        {user?.email && (
          <div className="flex items-center gap-3 p-4 bg-white border border-border rounded-[12px] mb-6">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[0.82rem] font-bold text-white shrink-0"
              style={{ background: "var(--color-navy)" }}
            >
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-[0.95rem] text-dark truncate">
                {user.email}
              </div>
              <div className="text-[0.72rem] text-muted">Direct Client</div>
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="bg-white border border-border rounded-[14px] overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border" style={{ background: "var(--color-off)" }}>
            <div className="text-[0.78rem] font-semibold text-dark">Order Items</div>
          </div>
          <div className="divide-y divide-border">
            {selectedItems.map((item) => (
              <div key={item.slug} className="flex items-center gap-3 px-5 py-4">
                <span className="text-[1.1rem]">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.82rem] font-semibold text-dark truncate">{item.serviceName}</div>
                  <div className="text-[0.72rem] text-muted">
                    {item.packageName}
                    {item.rush && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[0.62rem] font-bold text-amber bg-amber/10">
                        RUSH
                      </span>
                    )}
                    · {item.deliveryDays}d delivery
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[0.82rem] font-bold text-dark">{formatCents(item.retail_cents)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white border border-border rounded-[14px] p-5 mb-6">
          <div className="text-[0.78rem] font-semibold text-dark mb-4">Payment Method</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("balance")}
              className={`flex items-center gap-3 p-4 rounded-[10px] border-2 transition-all ${
                paymentMethod === "balance"
                  ? "border-teal bg-teal-pale"
                  : "border-border hover:border-navy"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  paymentMethod === "balance" ? "bg-teal text-white" : "bg-off text-muted"
                }`}
              >
                <Wallet className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-[0.82rem] font-bold text-dark">Wallet Balance</div>
                <div className="text-[0.68rem] text-muted">Use your credits</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`flex items-center gap-3 p-4 rounded-[10px] border-2 transition-all ${
                paymentMethod === "card"
                  ? "border-teal bg-teal-pale"
                  : "border-border hover:border-navy"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  paymentMethod === "card" ? "bg-teal text-white" : "bg-off text-muted"
                }`}
              >
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-[0.82rem] font-bold text-dark">Credit / Debit Card</div>
                <div className="text-[0.68rem] text-muted">Processed via Stripe</div>
              </div>
            </button>
          </div>
        </div>

        {/* Terms */}
        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <div className="mt-0.5">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-4 h-4 rounded border-border text-teal focus:ring-teal"
            />
          </div>
          <div className="text-[0.82rem] text-body">
            I confirm this order is correct and agree to the{" "}
            <span className="text-teal font-semibold">Terms of Service</span> and{" "}
            <span className="text-teal font-semibold">Refund Policy</span>.
          </div>
        </label>

        {submitError && (
          <div className="flex items-center gap-2 p-3 bg-red/10 border border-red/30 rounded-[10px] text-[0.82rem] text-red">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {submitError}
          </div>
        )}
      </div>

      {/* Right column - summary */}
      <div className="lg:sticky lg:top-6">
        <div className="bg-navy rounded-[16px] p-5 text-white shadow-lg">
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-white/50 mb-4">
            Order Summary
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {selectedItems.map((item) => (
              <div key={item.slug} className="flex items-center justify-between text-[0.78rem]">
                <span className="text-white/70 truncate mr-2">{item.serviceName}</span>
                <span className="font-bold whitespace-nowrap">{formatCents(item.retail_cents)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
            <span className="text-[0.82rem] font-bold">Total due</span>
            <span className="text-[1.3rem] font-extrabold">{formatCents(totals.retail)}</span>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[0.72rem] text-white/50">
            <CheckCircle className="w-3.5 h-3.5 text-green" />
            Payment via{" "}
            {paymentMethod === "balance" ? "wallet balance" : "credit card"}
          </div>
        </div>
      </div>
    </div>
  );
}
