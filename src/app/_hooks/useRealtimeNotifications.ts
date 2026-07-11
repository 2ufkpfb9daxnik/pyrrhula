"use client";

import { useEffect } from "react";
import { supabase } from "@/utils/supabase";

interface UseRealtimeNotificationsOptions {
  userId?: string;
  onNewNotification: () => void;
}

/**
 * 自分宛ての Notification INSERT を Supabase Realtime で購読する。
 */
export function useRealtimeNotifications({
  userId,
  onNewNotification,
}: UseRealtimeNotificationsOptions) {
  useEffect(() => {
    if (
      !userId ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
          filter: `receiverId=eq.${userId}`,
        },
        () => {
          onNewNotification();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, onNewNotification]);
}
