"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImpersonateButton({ agencyId, agencyName, compact }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agencyId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body.error ?? `Failed (${res.status})`);
      setLoading(false);
      return;
    }
    router.push(body.redirect ?? "/agency/dashboard");
    router.refresh();
  }

  if (compact) {
    return (
      <button
        onClick={go}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.72rem] font-semibold transition-colors disabled:opacity-60"
        style={{
          background: "rgba(124,58,237,0.1)",
          color: "#7c3aed",
          border: "1px solid rgba(124,58,237,0.25)",
        }}
      >
        {loading ? "Opening…" : "View as →"}
      </button>
    );
  }

  return (
    <button
      onClick={go}
      disabled={loading}
      title={`View ${agencyName}'s portal as admin`}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-sm font-semibold transition-all hover:-translate-y-px disabled:opacity-60"
      style={{
        background: "rgba(124,58,237,0.1)",
        color: "#7c3aed",
        border: "1px solid rgba(124,58,237,0.25)",
      }}
    >
      🛡️ {loading ? "Opening…" : `View as ${agencyName}`}
    </button>
  );
}
