"use client";

import { Menu, Search, Plus } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAgencyStore } from "@/lib/stores/useAgencyStore";
import { NotificationBell } from "@/components/shared/NotificationBell";

const VARIANTS = ["A", "B", "C", "D"];

export function AgencyTopbar({ title = "Dashboard", showSwitcher = false }) {
  const setSidebarOpen = useAgencyStore((s) => s.setSidebarOpen);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get("v") ?? "A";

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

      {showSwitcher && (
        <div
          className="hidden sm:flex ml-auto items-center gap-1.5 rounded-[10px] p-[3px] border border-border"
          style={{
            background: "var(--color-lg)",
            boxShadow: "inset 0 1px 3px rgba(11,31,58,0.07)",
          }}
        >
          {VARIANTS.map((v) => (
            <button
              key={v}
              onClick={() => {
                const next = new URLSearchParams(params);
                if (v === "A") next.delete("v");
                else next.set("v", v);
                const qs = next.toString();
                router.push(pathname + (qs ? `?${qs}` : ""));
              }}
              className={`px-3.5 py-1 rounded-[7px] text-xs font-bold transition-all ${
                active === v
                  ? "bg-navy text-white shadow-[0_2px_8px_rgba(11,31,58,0.22)]"
                  : "text-muted hover:bg-white hover:text-dark hover:shadow-sm"
              }`}
              style={{ letterSpacing: "0.04em" }}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {/* Search — desktop only */}
      <div
        className={`hidden md:flex items-center gap-2 bg-off border border-border rounded-[10px] px-3.5 py-[7px] shadow-sm w-[200px] ${
          showSwitcher ? "" : "ml-auto"
        }`}
      >
        <Search className="w-3.5 h-3.5 text-muted" strokeWidth={2.5} />
        <span className="text-[0.82rem] text-muted">search orders…</span>
      </div>

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
