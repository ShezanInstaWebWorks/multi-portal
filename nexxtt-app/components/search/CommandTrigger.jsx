"use client";

import { Search } from "lucide-react";
import { openCommandPalette } from "./CommandPalette";

/**
 * Compact search trigger for topbars. Clicking opens the palette; ⌘K also works.
 * `variant="dark"` inverts for dark backgrounds (navy client / referral topbars).
 */
export function CommandTrigger({ variant = "light", label = "Search" }) {
  const dark = variant === "dark";

  return (
    <button
      onClick={openCommandPalette}
      className="hidden md:inline-flex items-center gap-2 rounded-[10px] px-3 py-[7px] text-[0.82rem] font-semibold transition-all hover:-translate-y-px"
      style={
        dark
          ? {
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.75)",
            }
          : {
              background: "var(--color-off)",
              border: "1px solid var(--color-border)",
              color: "var(--color-muted)",
              boxShadow: "var(--shadow-sm)",
            }
      }
    >
      <Search className="w-3.5 h-3.5" strokeWidth={2.5} />
      <span>{label}</span>
      <kbd
        className="ml-1 px-1.5 py-0.5 rounded text-[0.65rem] font-bold"
        style={
          dark
            ? {
                background: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.55)",
              }
            : {
                background: "white",
                border: "1px solid var(--color-border)",
                color: "var(--color-muted)",
              }
        }
      >
        ⌘K
      </kbd>
    </button>
  );
}
