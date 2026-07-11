"use client";

import { useEffect } from "react";
import {
  createRealtimeChannel,
  isRealtimeConfigured,
  safeSubscribe,
} from "@/lib/supabase-realtime";
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
    if (!userId || !isRealtimeConfigured()) {
      return;
    }

    const channelName = `notifications-${userId}`;
    const channel = createRealtimeChannel(channelName);

    channel.on(
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
    );

    safeSubscribe(channel);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, onNewNotification]);
}
