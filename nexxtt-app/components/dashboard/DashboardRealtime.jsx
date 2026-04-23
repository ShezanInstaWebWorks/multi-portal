"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Subscribes to jobs / projects / clients for the current agency and calls
// `router.refresh()` on any change, so the server component re-renders with
// fresh data. Tenant isolation is handled by RLS — the user session only sees
// its own agency's rows on the realtime channel.
//
// Refreshes are debounced to 400ms so a burst of related events (jobs.insert
// + N projects.insert) collapses into one server round-trip.
export function DashboardRealtime({ agencyId }) {
  const router = useRouter();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!agencyId) return;

    const supabase = createClient();
    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.refresh();
      }, 400);
    };

    const channel = supabase
      .channel(`agency-dashboard-${agencyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs", filter: `agency_id=eq.${agencyId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients", filter: `agency_id=eq.${agencyId}` },
        scheduleRefresh
      )
      // Projects have no agency_id column — filter enforced by RLS. Events for
      // other agencies' projects won't reach this client.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [agencyId, router]);

  return null;
}
