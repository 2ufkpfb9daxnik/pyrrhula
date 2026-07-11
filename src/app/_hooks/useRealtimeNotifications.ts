"use client";

import { useEffect } from "react";
import { shouldUseRealtime } from "@/lib/realtime-lifecycle";
import { subscribeToNotifications } from "@/lib/realtime-manager";

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
    if (!userId || !shouldUseRealtime()) {
      return;
    }

    return subscribeToNotifications(userId, onNewNotification);
  }, [userId, onNewNotification]);
}
