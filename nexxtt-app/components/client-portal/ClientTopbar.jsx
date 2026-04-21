"use client";

import { NotificationBell } from "@/components/shared/NotificationBell";

export function ClientTopbar({ brand, userName }) {
  const initials = (userName ?? "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header
      className="h-14 flex items-center justify-between px-5 lg:px-7 shrink-0 sticky top-0 z-30"
      style={{
        background: "var(--wl-primary)",
        color: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {brand.logo_url ? (
          <img src={brand.logo_url} alt={brand.display_name} className="h-6 max-w-[160px] object-contain" />
        ) : (
          <div className="font-display text-[1rem] font-extrabold tracking-tight truncate">
            {brand.display_name}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell variant="dark" />
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[0.65rem] font-extrabold"
            style={{
              background: "var(--wl-accent)",
              color: "var(--wl-primary)",
            }}
          >
            {initials || "·"}
          </div>
          <span className="hidden sm:inline text-[0.82rem] font-semibold text-white/70">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}
