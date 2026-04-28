"use client";

import { useClientPortalStore } from "@/lib/stores/useClientPortalStore";
import { NotificationBell } from "@/components/shared/NotificationBell";

export function MobileAppBar({ brand, userId, userName }) {
  const setSidebarOpen = useClientPortalStore((s) => s.setSidebarOpen);

  return (
    <div
      className="bg-white border-b border-gray-200 lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
      style={{ background: brand.primary_colour ?? "#0B1F3A" }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="cursor-pointer p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="font-semibold text-white text-lg truncate max-w-45">
          {brand.display_name}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell userId={userId} variant="dark" />
        <div className="text-sm text-white/80 truncate max-w-25">
          {userName}
        </div>
      </div>
    </div>
  );
}
