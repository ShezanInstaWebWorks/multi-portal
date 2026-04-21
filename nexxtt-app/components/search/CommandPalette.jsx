"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * Global command palette — opens on ⌘K / Ctrl+K / the trigger button.
 * Mounted once per portal layout.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightKey, setHighlightKey] = useState(null);
  const inputRef = useRef(null);
  const latestReq = useRef(0);

  // Keyboard shortcut listener
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Re-expose the toggle for the trigger button
  useEffect(() => {
    window.__openCommandPalette = () => setOpen(true);
    return () => { delete window.__openCommandPalette; };
  }, []);

  // Focus on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setGroups([]);
      setHighlightKey(null);
      // Next tick to let the input render first
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 1) {
      setGroups([]);
      setLoading(false);
      return;
    }
    const reqId = ++latestReq.current;
    const handle = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const body = await res.json().catch(() => ({ groups: [] }));
      if (reqId === latestReq.current) {
        setGroups(body.groups ?? []);
        setLoading(false);
        // Highlight first item
        const firstItem = (body.groups ?? []).flatMap((g) => g.items)[0];
        setHighlightKey(firstItem ? `${firstItem.icon ?? ""}|${firstItem.id}` : null);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [query, open]);

  // Arrow-key navigation
  useEffect(() => {
    if (!open) return;
    const flat = groups.flatMap((g) => g.items);
    if (flat.length === 0) return;

    const onKey = (e) => {
      if (!["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) return;
      const currentIdx = flat.findIndex(
        (it) => `${it.icon ?? ""}|${it.id}` === highlightKey
      );
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = flat[Math.min(currentIdx + 1, flat.length - 1)];
        setHighlightKey(`${next.icon ?? ""}|${next.id}`);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = flat[Math.max(currentIdx - 1, 0)];
        setHighlightKey(`${next.icon ?? ""}|${next.id}`);
      } else if (e.key === "Enter" && currentIdx >= 0) {
        e.preventDefault();
        const item = flat[currentIdx];
        if (item.href) {
          setOpen(false);
          router.push(item.href);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groups, highlightKey, open, router]);

  if (!open) return null;

  function pickItem(item) {
    if (!item.href) return;
    setOpen(false);
    router.push(item.href);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: "rgba(11,31,58,0.55)", backdropFilter: "blur(4px)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[600px] rounded-[14px] bg-white shadow-lg overflow-hidden"
        style={{ border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <Search className="w-4 h-4 text-muted" strokeWidth={2.5} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, clients, services…"
            className="flex-1 outline-none text-[0.92rem] bg-transparent placeholder:text-muted"
          />
          <kbd
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[0.68rem] font-bold text-muted"
            style={{ background: "var(--color-lg)", border: "1px solid var(--color-border)" }}
          >
            ESC
          </kbd>
          <button
            onClick={() => setOpen(false)}
            className="sm:hidden w-7 h-7 flex items-center justify-center rounded-md hover:bg-off"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          {query.trim().length === 0 ? (
            <Hint />
          ) : loading && groups.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted">Searching…</div>
          ) : groups.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted">
              No results for “{query}”.
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="py-1">
                <div
                  className="px-4 py-1.5 text-[0.68rem] font-bold uppercase text-muted"
                  style={{ letterSpacing: "0.08em" }}
                >
                  {g.label}
                </div>
                {g.items.map((it) => {
                  const k = `${it.icon ?? ""}|${it.id}`;
                  const active = k === highlightKey;
                  return (
                    <button
                      key={k}
                      onClick={() => pickItem(it)}
                      onMouseEnter={() => setHighlightKey(k)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-2 transition-colors ${
                        active ? "bg-teal-pale" : "hover:bg-off"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[1rem] shrink-0"
                        style={{
                          background: active ? "white" : "var(--color-off)",
                          border: active
                            ? "1px solid var(--color-teal-bdr)"
                            : "1px solid var(--color-border)",
                        }}
                      >
                        {it.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.88rem] font-semibold text-dark truncate">
                          {it.title}
                        </div>
                        <div className="text-[0.72rem] text-muted truncate">
                          {it.subtitle}
                        </div>
                      </div>
                      {it.meta && (
                        <span
                          className="text-[0.68rem] font-semibold text-muted shrink-0"
                          style={{ letterSpacing: "0.04em" }}
                        >
                          {it.meta}
                        </span>
                      )}
                      {active && (
                        <span
                          className="text-[0.62rem] text-teal font-extrabold ml-2"
                          style={{ letterSpacing: "0.08em" }}
                        >
                          ↵
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div
          className="px-4 py-2 flex items-center justify-between text-[0.7rem] text-muted"
          style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-off)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
              <span>open</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
            <span>toggle</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Hint() {
  return (
    <div className="py-10 text-center text-sm text-muted">
      <div className="text-3xl mb-2 opacity-40">🔍</div>
      Start typing to search across your portal.
    </div>
  );
}

function Kbd({ children }) {
  return (
    <kbd
      className="px-1.5 py-[1px] rounded text-[0.65rem] font-bold text-muted"
      style={{ background: "white", border: "1px solid var(--color-border)" }}
    >
      {children}
    </kbd>
  );
}

/** Opens the globally-mounted command palette. Safe to call from anywhere. */
export function openCommandPalette() {
  if (typeof window !== "undefined" && typeof window.__openCommandPalette === "function") {
    window.__openCommandPalette();
  }
}
