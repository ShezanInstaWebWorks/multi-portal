"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Lightweight refresher: any change to project_requests / conversations /
// messages that the viewer can see triggers a debounced router.refresh().
// RLS on the subscription limits the stream to rows the current session
// actually has visibility into. Used on every requests + chat page so the
// sidebar ordering, request cards, and unread indicators stay live without
// needing a manual reload.
export function RequestsRealtime() {
  const router = useRouter();
  const timerRef = useRef(null);

  useEffect(() => {
    const supabase = createClient();
    const bump = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { router.refresh(); }, 350);
    };
    const channel = supabase
      .channel("requests-and-chat-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "project_requests" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" },    bump)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },    bump)
      .subscribe();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
