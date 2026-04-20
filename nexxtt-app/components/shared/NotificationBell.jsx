"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { createClient } from "@/lib/supabase/client";

// type → icon + tint mapping (matches MD §23.2 notification types)
const TYPE_STYLE = {
  order_update:  { icon: "📦", tint: "var(--color-teal-pale)",      border: "var(--color-teal-bdr)" },
  payment:       { icon: "💰", tint: "rgba(245,158,11,0.1)",         border: "rgba(245,158,11,0.25)" },
  client_action: { icon: "✅", tint: "rgba(16,185,129,0.1)",          border: "var(--color-green)" },
  commission:    { icon: "🤝", tint: "rgba(245,158,11,0.1)",         border: "rgba(245,158,11,0.25)" },
  system:        { icon: "🔔", tint: "rgba(124,58,237,0.08)",         border: "rgba(124,58,237,0.2)" },
};

/**
 * `variant="light"` → navy bell on white background (agency portal topbar).
 * `variant="dark"`  → white bell on dark background (client portal topbar).
 */
export function NotificationBell({ userId: userIdProp, variant = "light" }) {
  // If the caller didn't plumb the userId, resolve it client-side so every
  // topbar can drop this component in without boilerplate.
  const [resolvedUserId, setResolvedUserId] = useState(userIdProp ?? null);
  useEffect(() => {
    if (userIdProp) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setResolvedUserId(data.user?.id ?? null);
    });
  }, [userIdProp]);

  const userId = userIdProp ?? resolvedUserId;
  const { items, unread, markAllRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const buttonClasses =
    variant === "dark"
      ? "relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
      : "relative w-10 h-10 flex items-center justify-center rounded-[10px] bg-off border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all";

  const bellColor = variant === "dark" ? "text-white/80" : "text-body";

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Mark all read after a short delay so the user sees the count once.
      setTimeout(() => markAllRead(), 300);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button onClick={toggle} aria-label="Notifications" className={buttonClasses}>
        <Bell className={`w-4 h-4 ${bellColor}`} />
        {unread > 0 && (
          <span
            className="absolute min-w-[18px] h-[18px] px-1 rounded-full bg-red text-white text-[0.6rem] font-extrabold flex items-center justify-center border-2 border-white"
            style={
              variant === "dark"
                ? { top: -4, right: -4, borderColor: "var(--wl-primary)" }
                : { top: -4, right: -4 }
            }
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-24px)] bg-white rounded-[14px] z-50 overflow-hidden"
          style={{
            border: "1px solid var(--color-border)",
            boxShadow: "0 12px 40px rgba(11,31,58,0.18)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h4 className="font-display font-extrabold text-dark text-[0.95rem]">
              Notifications
            </h4>
            {items.some((n) => !n.is_read) && (
              <button
                onClick={() => markAllRead()}
                className="text-[0.72rem] text-teal font-semibold hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-3xl mb-2 opacity-40">🔔</div>
                <p className="text-sm text-muted">No notifications yet.</p>
              </div>
            ) : (
              items.map((n) => {
                const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.system;
                const body = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
                      n.link ? "hover:bg-off cursor-pointer" : ""
                    } ${!n.is_read ? "bg-teal-pale/40" : ""}`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.95rem] flex-shrink-0"
                      style={{ background: style.tint, border: `1px solid ${style.border}` }}
                    >
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.85rem] font-bold text-dark">
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-[0.75rem] text-muted mt-0.5">
                          {n.body}
                        </div>
                      )}
                      <div className="text-[0.68rem] text-muted mt-1">
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.is_read && (
                      <div
                        className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                        style={{ background: "var(--color-teal)" }}
                      />
                    )}
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                    {body}
                  </Link>
                ) : (
                  <div key={n.id}>{body}</div>
                );
              })
            )}
          </div>

          {items.length > 0 && (
            <div className="px-4 py-2 text-center border-t border-border">
              <span className="text-[0.72rem] text-muted">
                Showing {items.length} recent
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
