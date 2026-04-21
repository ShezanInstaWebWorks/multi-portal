"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAgencyStore } from "@/lib/stores/useAgencyStore";
import { NexxttLogo } from "@/components/auth/NexxttLogo";

const OVERVIEW = [
  { href: "/admin",        icon: "🛡️", label: "Admin Dashboard" },
  { href: "/admin/orders",  icon: "📋", label: "All Orders" },
];
const PORTALS = [
  { href: "/admin/agencies",  icon: "🏢", label: "Agencies" },
  { href: "/admin/clients",    icon: "👥", label: "Clients" },
  { href: "/admin/referrals",  icon: "🤝", label: "Referral Partners" },
];
const PLATFORM = [
  { href: "/admin/services",       icon: "✦",  label: "Service Catalog" },
  { href: "/admin/finance",         icon: "💰", label: "Platform Finance" },
  { href: "/admin/settings",       icon: "⚙️", label: "Platform Settings" },
  { href: "/admin/email-preview",  icon: "📧", label: "Email Preview" },
];

const ACCENT = "#7c3aed"; // --color-adm

export function AdminSidebar() {
  const pathname = usePathname();
  const setSidebarOpen = useAgencyStore((s) => s.setSidebarOpen);

  return (
    <div
      className="h-full flex flex-col text-white"
      style={{
        background: "linear-gradient(180deg, #0b1f3a 0%, #0a1427 60%, #060f1d 100%)",
      }}
    >
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <NexxttLogo width={110} />
        <div className="flex items-center gap-1.5">
          <span
            className="text-[0.55rem] font-extrabold uppercase px-[7px] py-0.5 rounded-full"
            style={{
              color: "#a78bfa",
              background: "rgba(124,58,237,0.18)",
              border: "1px solid rgba(124,58,237,0.35)",
              letterSpacing: "0.12em",
            }}
          >
            Admin
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white/70 bg-white/5"
            aria-label="Close menu"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        className="px-5 py-3.5 flex items-center gap-2.5"
        style={{ borderBottom: "1px solid rgba(124,58,237,0.2)" }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-extrabold text-sm"
          style={{ background: "rgba(124,58,237,0.18)", color: "#c4b5fd" }}
        >
          NX
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-sm text-white truncate">
            nexxtt.io HQ
          </div>
          <div className="text-[0.7rem]" style={{ color: "#a78bfa" }}>
            Platform Control
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <Section label="Overview">
          {OVERVIEW.map((item) => <AdminItem key={item.href} item={item} pathname={pathname} />)}
        </Section>
        <Section label="Portals">
          {PORTALS.map((item) => <AdminItem key={item.href} item={item} pathname={pathname} />)}
        </Section>
        <Section label="Platform">
          {PLATFORM.map((item) => <AdminItem key={item.href} item={item} pathname={pathname} />)}
        </Section>
      </nav>

      <div className="px-5 py-4 border-t border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
            style={{ background: "rgba(124,58,237,0.25)", color: "#c4b5fd" }}
          >
            RT
          </div>
          <div className="text-sm font-semibold text-white/80">Riya Tanaka</div>
        </div>
        <div className="text-[0.68rem] text-white/30 mt-1">Super Admin · HQ</div>
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

function Section({ label, children }) {
  return (
    <div className="mb-1">
      <div
        className="px-5 pt-2.5 pb-1 text-[0.62rem] font-bold uppercase text-white/25"
        style={{ letterSpacing: "0.14em" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function AdminItem({ item, pathname }) {
  const isActive =
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 mx-2.5 my-0.5 px-3 py-2 rounded-lg text-[0.83rem] font-medium transition-all ${
        isActive ? "text-white" : "text-white/65 hover:text-white"
      }`}
      style={
        isActive
          ? {
              background: "rgba(124,58,237,0.2)",
              borderLeft: `3px solid ${ACCENT}`,
              paddingLeft: "calc(0.75rem - 3px)",
              boxShadow: "0 2px 14px rgba(124,58,237,0.3), inset 0 0 0 1px rgba(124,58,237,0.25)",
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
    </Link>
  );
}
