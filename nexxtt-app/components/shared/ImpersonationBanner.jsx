"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ImpersonationBanner({ agencyName }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function stopImpersonating() {
    start(async () => {
      const res = await fetch("/api/admin/impersonate", { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      router.push(body.redirect ?? "/admin");
      router.refresh();
    });
  }

  return (
    <div
      className="px-4 lg:px-8 py-2 flex items-center gap-3 text-[0.78rem] font-semibold"
      style={{
        background: "rgba(124,58,237,0.12)",
        color: "#7c3aed",
        borderBottom: "1px solid rgba(124,58,237,0.25)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: "#7c3aed", boxShadow: "0 0 6px rgba(124,58,237,0.6)" }}
      />
      <span className="flex-1 truncate">
        🛡️ Admin preview — you&apos;re viewing{" "}
        <strong>{agencyName ?? "this agency"}</strong>&apos;s portal as an
        admin. Actions that mutate data are disabled.
      </span>
      <button
        onClick={stopImpersonating}
        disabled={pending}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.72rem] font-extrabold disabled:opacity-60"
        style={{
          background: "rgba(124,58,237,0.18)",
          color: "#7c3aed",
          border: "1px solid rgba(124,58,237,0.3)",
        }}
      >
        {pending ? "Stopping…" : "Stop impersonating"}
      </button>
    </div>
  );
}
