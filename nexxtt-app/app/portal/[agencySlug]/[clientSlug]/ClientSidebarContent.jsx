"use client";

import Link from "next/link";
import { useClientPortalStore } from "@/lib/stores/useClientPortalStore";
import { NexxttLogo } from "@/components/auth/NexxttLogo";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { X } from "lucide-react";

export function ClientSidebarContent({ brand, userName, firstName, agencySlug, clientSlug, userId, mobile }) {
  const primaryColor = brand.primary_colour ?? "#0B1F3A";
  const accentColor = brand.accent_colour ?? "#00B8A9";
  const setSidebarOpen = useClientPortalStore((s) => s.setSidebarOpen);

  const navItems = [
    { href: `/portal/${agencySlug}/${clientSlug}`, label: "Dashboard", icon: "🏠" },
    { href: `/portal/${agencySlug}/${clientSlug}/projects`, label: "Projects", icon: "📁" },
    { href: `/portal/${agencySlug}/${clientSlug}/requests`, label: "Requests", icon: "💬" },
  ];

  return (
    <div
      className="h-full flex flex-col text-white"
      style={{ background: primaryColor }}
    >
      {/* Logo row */}
      <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between">
        <NexxttLogo width={120} />
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Brand info card */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
          style={{ background: accentColor, color: primaryColor }}
        >
          {brand.display_name?.charAt(0) || "B"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-white truncate">
            {brand.display_name}
          </div>
          <div className="text-[0.7rem] text-white/50">Client Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 pt-2 pb-2">
          <span className="text-[0.6rem] font-semibold uppercase text-white/40" style={{ letterSpacing: "0.1em" }}>
            Menu
          </span>
        </div>
        {navItems.map((item) => (
          <NavItem key={item.href} item={item} onClick={() => mobile && setSidebarOpen(false)} />
        ))}
      </nav>

      {/* Footer - User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: accentColor, color: primaryColor }}
          >
            {firstName?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{userName}</div>
            <div className="text-[0.7rem] text-white/50">Client</div>
          </div>
        </div>
        <Link
          href="/login"
          className="block mt-3 text-[0.72rem] text-white/40 hover:text-white/70 text-left px-2"
        >
          Sign out
        </Link>
      </div>
    </div>
  );
}

function NavItem({ item, onClick }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="group flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-[0.85rem] font-medium transition-all text-white/60 hover:text-white hover:bg-white/5"
    >
      <span className="w-5 h-5 flex items-center justify-center text-lg">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}
