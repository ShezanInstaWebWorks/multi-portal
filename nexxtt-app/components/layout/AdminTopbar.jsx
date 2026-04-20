"use client";

import { Menu } from "lucide-react";
import { useAgencyStore } from "@/lib/stores/useAgencyStore";
import { NotificationBell } from "@/components/shared/NotificationBell";

export function AdminTopbar({ title = "Admin Dashboard" }) {
  const setSidebarOpen = useAgencyStore((s) => s.setSidebarOpen);

  return (
    <>
      <header
        className="h-topbar bg-white flex items-center gap-3 px-4 lg:px-8 sticky top-0 z-30 shadow-sm"
        style={{ borderBottom: "1px solid rgba(124,58,237,0.15)" }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-[10px] bg-off border border-border shadow-sm"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4 text-body" />
        </button>
        <h1 className="font-display font-bold text-dark text-[1.05rem] truncate flex items-center gap-2">
          🛡️ {title}
          <span
            className="hidden sm:inline text-[0.65rem] font-extrabold uppercase px-2 py-0.5 rounded-full"
            style={{
              color: "#a78bfa",
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.25)",
              letterSpacing: "0.1em",
            }}
          >
            Super Admin
          </span>
        </h1>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
        </div>
      </header>

      {/* Admin banner */}
      <div
        className="px-4 lg:px-8 py-2 text-[0.75rem] font-semibold flex items-center gap-2"
        style={{
          background: "rgba(124,58,237,0.08)",
          color: "#7c3aed",
          borderBottom: "1px solid rgba(124,58,237,0.15)",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#7c3aed", boxShadow: "0 0 6px rgba(124,58,237,0.6)" }}
        />
        Platform Admin — you have full read/write control over all portals, accounts, and orders.
      </div>
    </>
  );
}
