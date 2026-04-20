"use client";

import { Menu, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAgencyStore } from "@/lib/stores/useAgencyStore";
import { NotificationBell } from "@/components/shared/NotificationBell";

export function DirectTopbar({ title = "Dashboard" }) {
  const setSidebarOpen = useAgencyStore((s) => s.setSidebarOpen);
  const router = useRouter();

  return (
    <header className="h-topbar bg-white border-b border-border flex items-center gap-3 px-4 lg:px-8 sticky top-0 z-30 shadow-sm">
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-[10px] bg-off border border-border shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4 text-body" />
      </button>
      <h1 className="font-display font-bold text-dark text-[1.05rem] truncate">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <button
          onClick={() => router.push("/direct/orders/new")}
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-semibold text-white"
          style={{
            background: "var(--color-teal)",
            boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Order
        </button>
      </div>
    </header>
  );
}
