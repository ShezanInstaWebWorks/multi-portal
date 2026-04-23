"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ClipboardList, ListChecks, MessageCircle } from "lucide-react";

const ICONS = {
  overview: ClipboardList,
  tasks: ListChecks,
  chat: MessageCircle,
};

// Tab nav for the project workspace. Uses ?tab= so the page stays a server
// component. Pass `tabs` as the visible set; e.g. ['overview','tasks','chat'].
// `unreadCount` shows a badge on the chat tab.
export function ProjectTabs({ tabs = ["overview", "tasks", "chat"], unreadCount = 0 }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("tab") ?? tabs[0];

  return (
    <nav
      className="flex items-center gap-1 border-b border-border mb-4 overflow-x-auto bg-white rounded-t-[12px] px-2"
      style={{ boxShadow: "inset 0 -1px 0 var(--color-border)" }}
    >
      {tabs.map((key) => {
        const Icon = ICONS[key] ?? ClipboardList;
        const active = current === key;
        const params = new URLSearchParams(searchParams.toString());
        if (key === tabs[0]) params.delete("tab");
        else params.set("tab", key);
        const href = params.toString() ? `${pathname}?${params}` : pathname;

        return (
          <Link
            key={key}
            href={href}
            scroll={false}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-[0.85rem] font-semibold whitespace-nowrap transition-colors border-b-2 ${
              active
                ? "border-teal text-dark"
                : "border-transparent text-muted hover:text-dark"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {LABELS[key] ?? key}
            {key === "chat" && unreadCount > 0 && (
              <span
                className="ml-1 inline-flex items-center justify-center text-[0.65rem] font-bold rounded-full px-1.5 py-px"
                style={{ background: "var(--color-teal)", color: "var(--color-navy)", minWidth: 18 }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

const LABELS = {
  overview: "Overview",
  tasks: "Tasks",
  chat: "Discussion",
};
