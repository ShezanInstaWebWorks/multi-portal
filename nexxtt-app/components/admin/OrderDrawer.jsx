"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function OrderDrawer({ open, src, title, subtitle = "Order", onClose }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 right-0 h-screen w-full lg:w-[min(1080px,calc(100vw-80px))] bg-off z-[70] shadow-[0_-4px_40px_rgba(11,31,58,0.25)] flex flex-col transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title ? `${subtitle} ${title}` : "Details"}
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-white shrink-0">
          <div className="min-w-0">
            <div
              className="text-[0.64rem] font-bold uppercase text-muted"
              style={{ letterSpacing: "0.12em" }}
            >
              {subtitle}
            </div>
            <div className="font-display text-[0.95rem] font-extrabold text-dark truncate">
              {title ?? "—"}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="p-2 rounded-[8px] text-muted hover:text-dark hover:bg-off"
              title="Close (Esc)"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-hidden bg-off">
          {open && src && (
            <iframe
              key={src}
              src={src}
              title={title ? `${subtitle} ${title}` : "Workspace"}
              className="w-full h-full border-0 bg-off"
            />
          )}
        </div>
      </aside>
    </>
  );
}
