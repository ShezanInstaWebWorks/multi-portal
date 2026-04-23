"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";

export function PasswordChangeCard({ email }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const canSubmit =
    current.length > 0 &&
    next.length >= 8 &&
    next === confirm &&
    next !== current &&
    !submitting;

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? `Request failed (${res.status})`);
      return;
    }
    setSuccess(true);
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  return (
    <section className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-sm">
      <header className="flex items-center gap-2.5 mb-4">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center"
          style={{
            background: "rgba(0,184,169,0.12)",
            color: "var(--color-teal)",
          }}
        >
          <KeyRound className="w-4.5 h-4.5" />
        </div>
        <div>
          <h2 className="font-display text-[1.05rem] font-extrabold text-dark leading-tight">
            Change password
          </h2>
          <p className="text-[0.78rem] text-muted">
            {email ? `Signed in as ${email}` : "Update your sign-in password"}
          </p>
        </div>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-3.5 max-w-[440px]">
        <Field label="Current password">
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="input pr-10"
              placeholder="••••••••"
            />
            <ToggleEye show={showCurrent} onClick={() => setShowCurrent((s) => !s)} />
          </div>
        </Field>

        <Field label="New password" hint="Minimum 8 characters">
          <div className="relative">
            <input
              type={showNext ? "text" : "password"}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="input pr-10"
              placeholder="At least 8 characters"
            />
            <ToggleEye show={showNext} onClick={() => setShowNext((s) => !s)} />
          </div>
        </Field>

        <Field
          label="Confirm new password"
          error={confirm.length > 0 && confirm !== next ? "Passwords don't match" : null}
        >
          <input
            type={showNext ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input"
            placeholder="Re-enter the new password"
          />
        </Field>

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
        {success && (
          <div
            className="rounded-[8px] px-3 py-2 text-[0.82rem]"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.25)",
              color: "var(--color-green)",
            }}
          >
            Password updated.
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-px"
            style={{
              background: "var(--color-teal)",
              boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
            }}
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="block text-[0.75rem] font-bold text-body mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block text-[0.72rem] text-muted mt-1">{hint}</span>}
      {error && <span className="block text-[0.72rem] text-red mt-1">{error}</span>}
    </label>
  );
}

function ToggleEye({ show, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      aria-label={show ? "Hide password" : "Show password"}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-muted hover:text-dark"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}
