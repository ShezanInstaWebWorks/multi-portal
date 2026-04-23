"use client";

import { Menu, Search, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAgencyStore } from "@/lib/stores/useAgencyStore";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { openCommandPalette } from "@/components/search/CommandPalette";

export function AgencyTopbar({ title = "Dashboard" }) {
  const setSidebarOpen = useAgencyStore((s) => s.setSidebarOpen);
  const router = useRouter();

  return (
    <header
      className="h-topbar bg-white border-b border-border flex items-center gap-3 px-4 lg:px-8 sticky top-0 z-30 shadow-sm"
    >
      {/* Hamburger — mobile only */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-[10px] bg-off border border-border shadow-sm hover:shadow-md transition-shadow"
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4 text-body" />
      </button>

      <h1 className="font-display font-bold text-dark text-[1.05rem] truncate">
        {title}
      </h1>

      {/* Search — opens the global command palette (⌘K) */}
      <button
        type="button"
        onClick={() => openCommandPalette()}
        className="hidden md:flex items-center gap-2 bg-off border border-border rounded-[10px] px-3.5 py-[7px] shadow-sm w-[240px] ml-auto hover:bg-white hover:border-teal/40 transition-colors"
        aria-label="Search orders, clients and services"
      >
        <Search className="w-3.5 h-3.5 text-muted" strokeWidth={2.5} />
        <span className="text-[0.82rem] text-muted flex-1 text-left">Search orders, clients…</span>
        <kbd
          className="hidden lg:inline-flex items-center px-1.5 py-px rounded text-[0.65rem] font-bold text-muted"
          style={{ background: "var(--color-lg)", border: "1px solid var(--color-border)" }}
        >
          ⌘K
        </kbd>
      </button>

      <NotificationBell />


      {/* Mobile-only + Order button */}
      <button
        onClick={() => router.push("/agency/orders/new")}
        className="md:hidden inline-flex items-center gap-1 rounded-[10px] px-2.5 py-2 bg-teal text-white font-semibold text-xs shadow-[0_2px_10px_rgba(0,184,169,0.25)] active:translate-y-px"
      >
        <Plus className="w-3.5 h-3.5" />
        Order
      </button>
    </header>
  );
}
