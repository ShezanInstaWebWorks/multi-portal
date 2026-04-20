"use client";

import { useEffect } from "react";
import { useAgencyStore } from "@/lib/stores/useAgencyStore";

export function MobileDrawer({ children }) {
  const sidebarOpen = useAgencyStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAgencyStore((s) => s.setSidebarOpen);

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setSidebarOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden
      />
      {/* Panel */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-200 shadow-[4px_0_24px_rgba(0,0,0,0.35)] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!sidebarOpen}
      >
        {children}
      </aside>
    </>
  );
}
