"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type {
  NotificationsResponse,
  Notification,
} from "@/app/_types/notification";

export function useNotifications() {
  const [hasUnread, setHasUnread] = useState(false);
  const [lastNotification, setLastNotification] = useState<Notification | null>(
    null
  );
  const { data: session } = useSession();

  const checkNotifications = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch("/api/notifications");
      if (!response.ok) return;

      const data: NotificationsResponse = await response.json();

      if (data.notifications.length > 0) {
        const latestNotification = data.notifications[0];

        // 最新の通知が保存されていない、または異なる場合
        if (
          !lastNotification ||
          latestNotification.id !== lastNotification.id ||
          new Date(latestNotification.createdAt) >
            new Date(lastNotification.createdAt)
        ) {
          setHasUnread(true);
          setLastNotification(latestNotification);
        }
      }
    } catch (error) {
      console.error("Failed to check notifications:", error);
    }
  }, [session, lastNotification]);

  // 10分ごとにポーリング
  useEffect(() => {
    if (!session?.user) return;

    // 初回チェック
    checkNotifications();

    // ポーリングの設定
    const interval = setInterval(checkNotifications, 600000);

    return () => clearInterval(interval);
  }, [session, checkNotifications]);

  const markAsRead = useCallback(() => {
    setHasUnread(false);
  }, []);

  return {
    hasUnread,
    markAsRead,
    lastNotification, // 最新の通知情報も返す
  };
}
