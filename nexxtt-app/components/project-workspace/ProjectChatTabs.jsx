"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

// Two-pill switcher between the client-visible project chat and the private
// admin ↔ agency project chat. Driven by ?thread=admin in the URL.
//
// Rendered only for admin + agency viewers — clients should never see the
// private thread.
export function ProjectChatTabs({ variant = "agency" }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const active = sp.get("thread") === "admin" ? "admin" : "client";

  function go(which) {
    const next = new URLSearchParams(sp.toString());
    next.set("tab", "chat");
    if (which === "admin") next.set("thread", "admin");
    else next.delete("thread");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const clientLabel = "With client";
  const adminLabel = variant === "admin" ? "Private with agency" : "Private with super admin";

  return (
    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
      <button
        type="button"
        onClick={() => go("client")}
        className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold border transition-colors ${
          active === "client"
            ? "bg-teal text-white border-teal shadow-[0_2px_8px_rgba(0,184,169,0.25)]"
            : "bg-white text-muted border-border hover:text-teal hover:border-teal"
        }`}
      >
        💬 {clientLabel}
      </button>
      <button
        type="button"
        onClick={() => go("admin")}
        className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold border transition-colors ${
          active === "admin"
            ? "text-white shadow-[0_2px_8px_rgba(124,58,237,0.25)]"
            : "bg-white text-muted border-border hover:text-dark"
        }`}
        style={active === "admin"
          ? { background: "var(--color-adm, #7c3aed)", borderColor: "var(--color-adm, #7c3aed)" }
          : {}}
      >
        🛡 {adminLabel}
      </button>
    </div>
  );
}
