"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Portal chrome wrapper. Hides sidebar/topbar/nav when `?embed=1` is in the
// URL (used by the right-side order drawer). `children` is always rendered
// exactly once — pass the chrome pieces (topbar, sidebar, nav, footer,
// overlays) separately so React doesn't try to mount them twice.
export function EmbedShell({
  sidebar = null,       // rendered on the left, hidden in embed mode
  topbar = null,        // rendered above children
  nav = null,           // secondary nav strip below the topbar
  preview = null,       // optional preview/impersonation banner
  footer = null,        // rendered below children (bottom nav etc.)
  overlays = null,      // floating overlays like CommandPalette
  containerClassName = "flex min-h-screen flex-col bg-off",
  mainClassName = "flex-1 flex flex-col lg:ml-sidebar",
  children,
}) {
  const sp = useSearchParams();
  // Check both useSearchParams() AND window.location for iframe reliability
  const [isEmbed, setIsEmbed] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("embed") === "1" || sp.get("embed") === "1";
    }
    return sp.get("embed") === "1";
  });

  // Re-check on mount and when search params change (handles iframe navigation)
  useEffect(() => {
    const checkEmbed = () => {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const embedFromUrl = urlParams.get("embed") === "1";
        const embedFromHook = sp.get("embed") === "1";
        setIsEmbed(embedFromUrl || embedFromHook);
      }
    };
    checkEmbed();
    // Listen for popstate in case of client-side navigation within iframe
    window.addEventListener("popstate", checkEmbed);
    return () => window.removeEventListener("popstate", checkEmbed);
  }, [sp]);

  if (isEmbed) {
    return <div className="min-h-screen bg-off flex flex-col">{children}</div>;
  }

  if (sidebar) {
    // Sidebar variant (admin / agency / direct).
    return (
      <div className="flex min-h-screen bg-off">
        {sidebar}
        <div className={mainClassName}>
          {topbar}
          {preview}
          {children}
        </div>
        {footer}
        {overlays}
      </div>
    );
  }

  // Stacked variant (white-label portal).
  return (
    <div className={containerClassName}>
      {topbar}
      {nav}
      {preview}
      {children}
      {footer}
      {overlays}
    </div>
  );
}
