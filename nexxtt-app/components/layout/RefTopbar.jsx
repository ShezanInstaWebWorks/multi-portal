"use client";

import Link from "next/link";
import { NexxttLogo } from "@/components/auth/NexxttLogo";
import { NotificationBell } from "@/components/shared/NotificationBell";

export function RefTopbar({ userName = "Referral Partner" }) {
  const initials = (userName ?? "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header
      className="h-15 flex items-center justify-between px-5 lg:px-8 shrink-0 sticky top-0 z-30"
      style={{
        height: 60,
        background: "var(--color-navy)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <NexxttLogo width={110} />
        <div className="w-px h-4 bg-white/15 mx-1" />
        <span className="text-[0.72rem] text-white/35 hidden sm:inline">
          Referral Partner
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell variant="dark" />
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[0.75rem] font-extrabold"
          style={{
            background: "rgba(0,184,169,0.2)",
            border: "1px solid rgba(0,184,169,0.3)",
            color: "var(--color-teal)",
          }}
        >
          {initials || "·"}
        </div>
        <span className="hidden sm:inline text-[0.82rem] text-white/70">
          {userName}
        </span>
        <Link
          href="/login"
          className="text-[0.75rem] text-white/40 hover:text-white/70 px-2"
        >
          Sign out
        </Link>
      </div>
    </header>
  );
}
