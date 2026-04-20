"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes the current user to their own notifications stream.
 * Initial fetch returns the latest 20; Realtime pushes new inserts/updates.
 *
 * @param {string|null} userId — the auth.users.id of the viewer, or null to skip
 */
export function useNotifications(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let channel;

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, link, is_read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      setItems(data ?? []);
      setLoading(false);

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            setItems((prev) => {
              if (prev.some((n) => n.id === payload.new.id)) return prev;
              return [payload.new, ...prev].slice(0, 50);
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            setItems((prev) =>
              prev.map((n) => (n.id === payload.new.id ? { ...n, ...payload.new } : n))
            );
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  const unread = items.filter((n) => !n.is_read).length;

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  }, [userId]);

  return { items, unread, loading, markAllRead };
}
