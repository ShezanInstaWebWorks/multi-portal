"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

export function CronJobCard({ label, description, schedule, jobKey, lastRun }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function run() {
    setPending(true);
    setError(null);
    setResult(null);
    const res = await fetch(`/api/admin/cron/${jobKey}`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? `Failed (${res.status})`);
      return;
    }
    setResult(body.result);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 py-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-dark text-[0.88rem]">{label}</div>
        <div className="text-[0.72rem] text-muted">{description}</div>
        <div
          className="text-[0.68rem] text-muted mt-1 font-mono"
          style={{ letterSpacing: "0.02em" }}
        >
          schedule: <span className="text-body">{schedule}</span>
          {lastRun && (
            <>
              {" · "}last run: <span className="text-body">{lastRun}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {result != null && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-bold"
            style={{
              background: "rgba(16,185,129,0.1)",
              color: "var(--color-green)",
              border: "1px solid rgba(16,185,129,0.25)",
            }}
          >
            ✓ {result} processed
          </span>
        )}
        {error && (
          <span className="text-[0.72rem] text-red">{error}</span>
        )}
        <button
          onClick={run}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[0.78rem] font-semibold transition-all disabled:opacity-60 hover:-translate-y-px"
          style={{
            background: "rgba(124,58,237,0.1)",
            color: "#7c3aed",
            border: "1px solid rgba(124,58,237,0.3)",
          }}
        >
          <Play className="w-3 h-3" />
          {pending ? "Running…" : "Run now"}
        </button>
      </div>
    </div>
  );
}
