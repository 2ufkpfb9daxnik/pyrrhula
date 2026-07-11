"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  NotificationsResponse,
  Notification,
} from "@/app/_types/notification";
import { useRealtimeNotifications } from "@/app/_hooks/useRealtimeNotifications";

type NotificationsSummaryResponse = NotificationsResponse & {
  unreadCount: number;
};

const NOTIFICATION_POLL_MS = 30_000;

export function useNotifications() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const { data, refetch, isFetching } = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () =>
      fetchJson<NotificationsSummaryResponse>("/api/notifications?limit=5"),
    enabled: !!userId,
    refetchInterval: NOTIFICATION_POLL_MS,
    refetchOnWindowFocus: true,
  });

  const handleRealtimeUpdate = useCallback(() => {
    void refetch();
  }, [refetch]);

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
          queryKeys.notifications(),
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
