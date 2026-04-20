"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAgencyStore } from "@/lib/stores/useAgencyStore";
import { NexxttLogo } from "@/components/auth/NexxttLogo";

const NAV = [
  { href: "/direct/dashboard",  icon: "🏠", label: "Dashboard" },
  { href: "/direct/orders",      icon: "📋", label: "My Orders" },
  { href: "/direct/orders/new",  icon: "✚",  label: "New Order" },
  { href: "/direct/account",     icon: "⚙️", label: "Account" },
];

export function DirectSidebar() {
  const pathname = usePathname();
  const setSidebarOpen = useAgencyStore((s) => s.setSidebarOpen);

  return (
    <div
      className="h-full flex flex-col text-white"
      style={{
        background:
          "linear-gradient(180deg, #0b1f3a 0%, #0d1f38 60%, #060f1d 100%)",
      }}
    >
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <NexxttLogo width={110} />
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white/70 bg-white/5"
          aria-label="Close menu"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-extrabold text-sm"
          style={{
            background: "rgba(16,185,129,0.15)",
            color: "var(--color-green)",
          }}
        >
          TC
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-sm text-white truncate">
            TechCore SaaS
          </div>
          <div className="text-[0.7rem] text-white/40">Direct Client</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 mx-2.5 my-0.5 px-3 py-2 rounded-lg text-[0.83rem] font-medium transition-all ${
                isActive ? "text-white" : "text-white/65 hover:text-white"
              }`}
              style={
                isActive
                  ? {
                      background: "rgba(0,184,169,0.12)",
                      borderLeft: "3px solid var(--color-teal)",
                      paddingLeft: "calc(0.75rem - 3px)",
                      boxShadow:
                        "0 2px 14px rgba(0,184,169,0.18), inset 0 0 0 1px rgba(0,184,169,0.15)",
                    }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.transform = "translateX(2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "";
                  e.currentTarget.style.transform = "";
                }
              }}
            >
              <span className="w-4 h-4 flex items-center justify-center text-[0.9rem] flex-shrink-0">
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
            style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
          >
            MR
          </div>
          <div className="text-sm font-semibold text-white/80">Marcus Reid</div>
        </div>
        <Link
          href="/login"
          className="block mt-2 text-[0.72rem] text-white/30 hover:text-white/60 text-left"
        >
          Sign out
        </Link>
      </div>
    </div>
  );
}
