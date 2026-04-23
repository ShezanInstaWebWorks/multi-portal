"use client";

import { useSearchParams } from "next/navigation";

// Swaps a portal's normal chrome (sidebar/topbar/bottom-nav) for a bare
// container when `?embed=1` is in the URL. The drawer on the orders list
// uses this flag to hide chrome inside the iframe.
//
// Usage: wrap the portal layout's return in <EmbedShell shell={...}>{children}</EmbedShell>.
// `shell`   — what to render in normal mode (receives children itself).
// children  — what to render inside the bare embed container.
export function EmbedShell({ shell, children }) {
  const sp = useSearchParams();
  const isEmbed = sp.get("embed") === "1";
  if (isEmbed) return children;
  return shell;
}
