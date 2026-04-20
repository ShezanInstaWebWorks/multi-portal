"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, PlusCircle, Users, TrendingUp } from "lucide-react";

const ITEMS = [
  { href: "/agency/dashboard",      icon: Home,          label: "Home" },
  { href: "/agency/orders",          icon: ClipboardList, label: "Orders" },
  { href: "/agency/orders/new",      icon: PlusCircle,    label: "New" },
  { href: "/agency/clients",          icon: Users,         label: "Clients" },
  { href: "/agency/finance/profit",   icon: TrendingUp,    label: "Finance" },
];

export function AgencyBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-border z-40 shadow-[0_-2px_12px_rgba(11,31,58,0.06)]">
      <div className="flex items-center justify-around h-16">
        {ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center transition-colors ${
                isActive ? "text-teal" : "text-muted"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
