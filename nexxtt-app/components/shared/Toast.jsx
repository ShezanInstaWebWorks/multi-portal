"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

// Minimal toast system. Mount `<ToastProvider>` at the app root; call
// `useToast()` from any client component:
//   const toast = useToast();
//   toast.success("Offer sent");
//   toast.error("Something went wrong");
//   toast.info("Heads up");

const ToastContext = createContext(null);

const DEFAULT_TTL = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind, message, opts = {}) => {
      const id = crypto.randomUUID();
      const ttl = opts.ttl ?? DEFAULT_TTL;
      setToasts((prev) => [...prev, { id, kind, message }]);
      if (ttl > 0) setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss]
  );

  const api = {
    success: (m, o) => push("success", m, o),
    error:   (m, o) => push("error",   m, o),
    info:    (m, o) => push("info",    m, o),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe no-op outside a provider so components don't crash in isolation.
    return { success: () => {}, error: () => {}, info: () => {}, dismiss: () => {} };
  }
  return ctx;
}

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const style = KIND_STYLE[toast.kind] ?? KIND_STYLE.info;
  const Icon = style.icon;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 min-w-[260px] max-w-[360px] rounded-[12px] px-3.5 py-3 shadow-[0_8px_24px_rgba(11,31,58,0.18)] border transition-all duration-200 ${
        mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3"
      }`}
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.color,
      }}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 text-[0.85rem] font-semibold leading-snug">
        {toast.message}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
        type="button"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const KIND_STYLE = {
  success: {
    icon: CheckCircle2,
    bg: "white",
    border: "rgba(16,185,129,0.35)",
    color: "var(--color-dark)",
  },
  error: {
    icon: XCircle,
    bg: "white",
    border: "rgba(239,68,68,0.35)",
    color: "var(--color-dark)",
  },
  info: {
    icon: Info,
    bg: "white",
    border: "var(--color-border)",
    color: "var(--color-dark)",
  },
};
