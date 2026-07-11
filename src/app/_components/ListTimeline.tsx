"use client";

import { useMemo, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { LoaderCircle } from "lucide-react";
import { PostList } from "@/app/_components/PostList";
import { StaleRefreshBanner } from "@/app/_components/StaleRefreshBanner";
import { useRealtimeTimeline } from "@/app/_hooks/useRealtimeTimeline";
import { fetchJson } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { TimelinePageResponse } from "@/lib/api/timeline";
import { STALE_TIME_MS, GC_TIME_MS } from "@/lib/query-client";
import { syncNotificationsInBackground } from "@/lib/sync-notifications";
import { formatApiPost } from "@/lib/format-post";
import { useTimelineSettings } from "@/app/_hooks/useTimelineSettings";

interface ListTimelineProps {
  listId: string;
}

export function ListTimeline({ listId }: ListTimelineProps) {
  const { ref, inView } = useInView();
  const hasEnteredLoadMoreRef = useRef(false);
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    isStale,
    isFetching,
    dataUpdatedAt,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.listTimeline(listId),
    queryFn: async ({ pageParam }) => {
      const searchParams = new URLSearchParams();
      if (pageParam) searchParams.set("cursor", pageParam);
      searchParams.set("limit", "10");
      return fetchJson<TimelinePageResponse>(
        `/api/lists/${listId}/timeline?${searchParams.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { settings } = useTimelineSettings();

  const handleAutoUpdate = useCallback(() => {
    syncNotificationsInBackground(queryClient);
    void refetch();
  }, [queryClient, refetch]);

  const { hasNewPosts, clearNewPosts } = useRealtimeTimeline({
    channelName: `list-timeline-${listId}`,
    autoUpdate: settings.updateMode === "auto",
    onAutoUpdate: handleAutoUpdate,
  });

  const handleNewPostsBannerClick = useCallback(async () => {
    clearNewPosts();
    syncNotificationsInBackground(queryClient);
    await queryClient.invalidateQueries({
      queryKey: queryKeys.listTimeline(listId),
    });
  }, [clearNewPosts, queryClient, listId]);

  const handleRefresh = useCallback(() => {
    syncNotificationsInBackground(queryClient);
    void refetch();
  }, [queryClient, refetch]);

  const posts = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.posts.map(formatApiPost));
  }, [data]);

  useEffect(() => {
    const entered = inView && !hasEnteredLoadMoreRef.current;
    if (entered && hasNextPage && !isFetchingNextPage) {
      syncNotificationsInBackground(queryClient);
      void fetchNextPage();
    }
    hasEnteredLoadMoreRef.current = inView;
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, queryClient]);

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        タイムラインの読み込みに失敗しました
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        まだ投稿がありません
      </div>
    );
  }

  return (
    <div>
      {hasNewPosts && (
        <div className="sticky top-0 z-30 flex justify-center px-4 py-2">
          <button
            onClick={handleNewPostsBannerClick}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
          >
            ↑ 新しい投稿があります
          </button>
        </div>
      )}

      {isStale && (
        <StaleRefreshBanner
          isStale={isStale}
          isFetching={isFetching}
          dataUpdatedAt={dataUpdatedAt}
          onRefresh={handleRefresh}
          label="リストタイムラインを更新"
        />
      )}

      <PostList posts={posts} />

      {hasNextPage && (
        <div ref={ref} className="py-4 text-center">
          {isFetchingNextPage ? (
            <LoaderCircle className="size-6 animate-spin text-primary" />
          ) : null}
        </div>
      )}
    </div>
  );
}
