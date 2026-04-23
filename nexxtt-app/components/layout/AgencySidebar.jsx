"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgencyStore } from "@/lib/stores/useAgencyStore";
import { NexxttLogo } from "@/components/auth/NexxttLogo";
import { X } from "lucide-react";

const MAIN = [
  { href: "/agency/dashboard",   icon: "🏠", label: "Dashboard" },
  { href: "/agency/requests",    icon: "💬", label: "Requests & Chat" },
  { href: "/agency/orders/new",  icon: "✚",  label: "New Order" },
  { href: "/agency/orders",      icon: "📋", label: "All Orders", badge: "4" },
];
const CLIENTS = [
  { href: "/agency/clients",               icon: "👥", label: "Client Manager" },
  { href: "/agency/clients/invite",        icon: "✉️", label: "Invite Client" },
  { href: "/agency/settings/portal-preview", icon: "🔗", label: "Client Portal Preview" },
];
const FINANCE = [
  { href: "/agency/finance/profit",  icon: "📈", label: "Profit Dashboard" },
  { href: "/agency/finance/balance", icon: "💰", label: "Balance" },
];
const SETTINGS = [
  { href: "/agency/settings", icon: "🎨", label: "Brand Settings" },
];

export function AgencySidebar() {
  const pathname = usePathname();
  const setSidebarOpen = useAgencyStore((s) => s.setSidebarOpen);
  const [open, setOpen] = useState({
    clients:  CLIENTS.some((i) => pathname.startsWith(i.href)),
    finance:  FINANCE.some((i) => pathname.startsWith(i.href)),
    settings: SETTINGS.some((i) => pathname.startsWith(i.href)),
  });

  return (
    <div
      className="h-full flex flex-col text-white"
      style={{
        background:
          "linear-gradient(180deg, #1e3a5f 0%, #0d1f38 60%, #060f1d 100%)",
      }}
    >
      {/* Logo row */}
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

      {/* Agency info card */}
      <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-extrabold text-sm"
          style={{ background: "rgba(0,184,169,0.18)", color: "var(--color-teal)" }}
        >
          BA
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-sm text-white truncate">
            Bright Agency Co.
          </div>
          <div className="text-[0.7rem] text-white/40">Agency Partner</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        <NavSection label="Main">
          {MAIN.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </NavSection>

        <NavGroup
          label="Clients"
          open={open.clients}
          onToggle={() => setOpen((o) => ({ ...o, clients: !o.clients }))}
        >
          {CLIENTS.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </NavGroup>

        <NavGroup
          label="Finance"
          open={open.finance}
          onToggle={() => setOpen((o) => ({ ...o, finance: !o.finance }))}
        >
          {FINANCE.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </NavGroup>

        <NavGroup
          label="Settings"
          open={open.settings}
          onToggle={() => setOpen((o) => ({ ...o, settings: !o.settings }))}
        >
          {SETTINGS.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </NavGroup>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
            style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
          >
            AJ
          </div>
          <div className="text-sm font-semibold text-white/80">Alex Johnson</div>
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

function NavSection({ label, children }) {
  return (
    <div className="mb-1">
      <div
        className="px-5 pt-2.5 pb-1 text-[0.62rem] font-bold uppercase text-white/25"
        style={{ letterSpacing: "0.14em" }}
      >
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function NavGroup({ label, open, onToggle, children }) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full px-5 pt-2.5 pb-1 text-[0.62rem] font-bold uppercase text-white/25 flex items-center justify-between"
        style={{ letterSpacing: "0.14em" }}
      >
        <span>{label}</span>
        <span
          className="text-[0.55rem] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function NavItem({ item, pathname }) {
  const isActive =
    item.href === "/agency/dashboard"
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-2.5 mx-2.5 my-0.5 px-3 py-2 rounded-lg text-[0.83rem] font-medium transition-all ${
        isActive ? "text-white" : "text-white/65 hover:text-white"
      }`}
      style={
        isActive
          ? {
              background:
                "linear-gradient(90deg, rgba(255,100,50,0.25), rgba(255,160,60,0.12))",
              borderLeft: "3px solid #ff7c35",
              boxShadow:
                "0 2px 14px rgba(255,100,50,0.2), inset 0 0 0 1px rgba(255,100,50,0.15)",
              paddingLeft: "calc(0.75rem - 3px)",
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
      <span className="w-4 h-4 flex items-center justify-center text-[0.9rem] shrink-0">
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span
          className="px-1.5 py-[1px] rounded-md text-[0.65rem] font-bold"
          style={{
            background: "rgba(0,184,169,0.18)",
            color: "var(--color-teal)",
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
