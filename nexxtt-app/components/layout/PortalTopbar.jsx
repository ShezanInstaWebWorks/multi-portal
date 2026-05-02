"use client";

import { Menu } from "lucide-react";
import { useClientPortalStore } from "@/lib/stores/useClientPortalStore";
import { NotificationBell } from "@/components/shared/NotificationBell";

export function PortalTopbar({ title = "Dashboard" }) {
  const setSidebarOpen = useClientPortalStore((s) => s.setSidebarOpen);

  return (
    <header className="h-topbar bg-white border-b border-border flex items-center gap-3 px-4 lg:px-8 sticky top-0 z-30 shadow-sm">
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-[10px] bg-off border border-border shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4 text-body" />
      </button>
      <h1 className="font-display font-bold text-dark text-[1.05rem] truncate flex-1">
        {title}
      </h1>
      <div className="flex items-center gap-2">
        <NotificationBell />
      </div>
    </header>
  );
}
