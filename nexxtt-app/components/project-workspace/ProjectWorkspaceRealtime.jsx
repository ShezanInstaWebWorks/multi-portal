"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Refreshes the project workspace when the project row, its tasks, or its
// chat changes. Filters by project_id where possible; tasks subscription
// uses the per-project filter, project subscription uses id.
export function ProjectWorkspaceRealtime({ projectId, conversationId }) {
  const router = useRouter();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!projectId) return;
    const supabase = createClient();
    const bump = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => router.refresh(), 350);
    };
    const channel = supabase
      .channel(`project-workspace-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects",      filter: `id=eq.${projectId}` }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_tasks", filter: `project_id=eq.${projectId}` }, bump);

    if (conversationId) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        bump
      );
    }

    channel.subscribe();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [projectId, conversationId, router]);

  return null;
}
