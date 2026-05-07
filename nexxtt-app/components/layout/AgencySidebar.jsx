"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgencyStore } from "@/lib/stores/useAgencyStore";
import { NexxttLogo } from "@/components/auth/NexxttLogo";
import { X, Users, Mail, Link2, TrendingUp, Wallet, Palette, Home, MessageSquare, PlusCircle, ClipboardList, LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CLIENTS_NAV = [
  { href: "/agency/clients",               icon: Users, label: "Client Manager" },
  { href: "/agency/clients/invite",        icon: Mail, label: "Invite Client" },
  { href: "/agency/settings/portal-preview", icon: Link2, label: "Client Portal Preview" },
];
const FINANCE_NAV = [
  { href: "/agency/finance/profit",  icon: TrendingUp, label: "Profit Dashboard" },
  { href: "/agency/finance/balance", icon: Wallet, label: "Balance" },
];
const SETTINGS_NAV = [
  { href: "/agency/settings", icon: Palette, label: "Brand Settings" },
];

export function AgencySidebar({
  agencyName = "Your Agency",
  agencyInitials = "A",
  userName = "",
  userInitials = "U",
  userRole = "Agency Partner",
  ordersCount = null,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const setSidebarOpen = useAgencyStore((s) => s.setSidebarOpen);
  const [open, setOpen] = useState({
    clients:  CLIENTS_NAV.some((i) => pathname.startsWith(i.href)),
    finance:  FINANCE_NAV.some((i)  => pathname.startsWith(i.href)),
    settings: SETTINGS_NAV.some((i) => pathname.startsWith(i.href)),
  });

  const MAIN_NAV = [
    { href: "/agency/dashboard",  icon: Home, label: "Dashboard" },
    { href: "/agency/requests",   icon: MessageSquare, label: "Chat" },
    { href: "/agency/orders/new", icon: PlusCircle,  label: "New Order" },
    {
      href: "/agency/orders",
      icon: ClipboardList,
      label: "All Orders",
      badge: ordersCount != null && ordersCount > 0 ? String(ordersCount) : null,
    },
  ];

  const roleLabel =
    userRole === "admin" ? "Admin (preview)" :
    userRole === "agency" ? "Agency Partner" :
    userRole;

  return (
    <div className="h-full flex flex-col text-white" style={{ background: "#1a1f3a" }}>

      {/* Logo row */}
      <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between">
        <NexxttLogo width={120} />
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Agency info card */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
          style={{ background: "linear-gradient(135deg, #00b8a9 0%, #00a095 100%)", color: "#1a1f3a" }}
        >
          {agencyInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-white truncate">{agencyName}</div>
          <div className="text-[0.7rem] text-white/50">Agency Partner</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        <NavSection label="Main">
          {MAIN_NAV.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </NavSection>

        <NavGroup
          label="Clients"
          open={open.clients}
          onToggle={() => setOpen((o) => ({ ...o, clients: !o.clients }))}
        >
          {CLIENTS_NAV.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </NavGroup>

        <NavGroup
          label="Finance"
          open={open.finance}
          onToggle={() => setOpen((o) => ({ ...o, finance: !o.finance }))}
        >
          {FINANCE_NAV.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </NavGroup>

        <NavGroup
          label="Settings"
          open={open.settings}
          onToggle={() => setOpen((o) => ({ ...o, settings: !o.settings }))}
        >
          {SETTINGS_NAV.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </NavGroup>
      </nav>

      {/* Footer — signed-in user */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
            style={{ background: "#00b8a9", color: "#1a1f3a" }}
          >
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {userName || "Account"}
            </div>
            <div className="text-[0.7rem] text-white/50">{roleLabel}</div>
          </div>
          <button
            onClick={async () => {
              await createClient().auth.signOut();
              router.push("/login");
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function NavSection({ label, children }) {
  return (
    <div className="mb-1">
      <div
        className="px-5 pt-4 pb-2 text-[0.6rem] font-semibold uppercase text-white/40"
        style={{ letterSpacing: "0.1em" }}
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
        className="w-full px-5 pt-4 pb-2 text-[0.6rem] font-semibold uppercase text-white/40 flex items-center justify-between"
        style={{ letterSpacing: "0.1em" }}
      >
        <span>{label}</span>
        <span
          className="text-[0.5rem] transition-transform duration-200 text-white/40"
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

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-[0.85rem] font-medium transition-all ${
        isActive ? "text-white" : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
      style={
        isActive
          ? {
              background: "rgba(0,184,169,0.15)",
              borderLeft: "3px solid #00b8a9",
              paddingLeft: "calc(0.75rem - 3px)",
            }
          : undefined
      }
    >
      <span className="w-4 h-4 flex items-center justify-center shrink-0">
        {typeof Icon === "string" ? (
          <span className="text-[0.9rem]">{Icon}</span>
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span
          className="px-1.5 py-px rounded-md text-[0.65rem] font-bold"
          style={{ background: "rgba(0,184,169,0.18)", color: "var(--color-teal)" }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
