"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/app/_types/notification";
import { useRealtimeNotifications } from "@/app/_hooks/useRealtimeNotifications";
import {
  notificationSummaryQueryOptions,
  type NotificationsSummaryResponse,
} from "@/lib/sync-notifications";

export function useNotifications() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const { data, refetch, isFetching } = useQuery({
    ...notificationSummaryQueryOptions,
    enabled: !!userId,
    // アイドル時のポーリング・フォーカス時の自動 refetch は行わない
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const handleRealtimeUpdate = useCallback(() => {
    void refetch();
  }, [refetch]);

  // 新着通知は Realtime（WebSocket）で検知。HTTP ポーリングは使わない
  useRealtimeNotifications({
    userId,
    onNewNotification: handleRealtimeUpdate,
  });

  const markAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        queryClient.setQueryData<NotificationsSummaryResponse>(
          notificationSummaryQueryOptions.queryKey,
          (old) =>
            old
              ? {
                  ...old,
                  unreadCount: 0,
                  notifications: old.notifications.map((n) => ({
                    ...n,
                    isRead: true,
                  })),
                }
              : old,
        );
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  }, [userId, queryClient]);

  const unreadCount = data?.unreadCount ?? 0;
  const lastNotification: Notification | null =
    data?.notifications[0] ?? null;

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    markAsRead,
    lastNotification,
    isFetching,
    refetch,
  };
}
