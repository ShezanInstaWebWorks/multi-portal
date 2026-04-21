"use client";

import Link from "next/link";
import { LayoutDashboard, List } from "lucide-react";

/**
 * Small pill-style switcher rendered at the top of /agency/dashboard.
 * Reads ?view from searchParams via the passed `current` prop so it works
 * on both the server-rendered page and subsequent client navigations.
 */
export function DashboardViewSwitcher({ current }) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <Tab href="/agency/dashboard"            active={current === "d"}    icon={<LayoutDashboard className="w-3.5 h-3.5" />} label="Overview" />
      <Tab href="/agency/dashboard?view=list"  active={current === "list"} icon={<List className="w-3.5 h-3.5" />}            label="List" />
    </div>
  );
}

function Tab({ href, active, icon, label }) {
  return (
    <Link
      href={href}
      prefetch
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.78rem] font-semibold transition-colors border"
      style={
        active
          ? {
              background: "var(--color-navy)",
              borderColor: "var(--color-navy)",
              color: "white",
            }
          : {
              background: "white",
              borderColor: "var(--color-border)",
              color: "var(--color-muted)",
            }
      }
    >
      {icon}
      {label}
    </Link>
  );
}
