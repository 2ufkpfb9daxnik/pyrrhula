import type { QueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { NotificationsResponse } from "@/app/_types/notification";

export type NotificationsSummaryResponse = NotificationsResponse & {
  unreadCount: number;
};

export const notificationSummaryQueryOptions = {
  queryKey: queryKeys.notifications(),
  queryFn: () =>
    fetchJson<NotificationsSummaryResponse>("/api/notifications?limit=5"),
};

/**
 * ユーザーの明示的な操作に合わせて、裏で未読通知数を更新する。
 * ナビがマウントされているときだけ refetch される（アイドル時のポーリングはしない）。
 */
export function syncNotificationsInBackground(
  queryClient: QueryClient,
): void {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications(),
    refetchType: "active",
  });
}
