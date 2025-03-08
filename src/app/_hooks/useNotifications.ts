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

      // 通知がある場合の処理
      if (data.notifications.length > 0) {
        const latestNotification = data.notifications[0];

        // 未読通知があるかどうかをチェック
        const hasAnyUnread = data.notifications.some(
          (notification) => notification.isRead === false
        );

        // 未読通知があればハイライト表示
        setHasUnread(hasAnyUnread);

        // 最新の通知を保存
        setLastNotification(latestNotification);
      }
    } catch (error) {
      console.error("Failed to check notifications:", error);
    }
  }, [session]);

  // 10分ごとにポーリング
  useEffect(() => {
    if (!session?.user) return;

    // 初回チェック
    checkNotifications();

    // ポーリングの設定
    const interval = setInterval(checkNotifications, 600000);

    return () => clearInterval(interval);
  }, [session, checkNotifications]);

  // 通知を既読にするメソッド
  const markAsRead = useCallback(async () => {
    if (!session?.user) return;

    try {
      // 通知一覧ページを訪問した際は全て既読にする
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // ローカルの状態を更新
        setHasUnread(false);
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  }, [session]);

  return {
    hasUnread,
    markAsRead,
    lastNotification,
    checkNotifications, // 必要に応じて通知状態を手動更新するため
  };
}
