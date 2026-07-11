"use client";

import { useCallback } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import { useTimelineInfiniteQuery } from "@/app/_hooks/useTimelineInfiniteQuery";
import { TimelineFeedView } from "@/app/_components/TimelineFeedView";
import { useRealtimeTimeline } from "@/app/_hooks/useRealtimeTimeline";
import { useTimelineSettings } from "@/app/_hooks/useTimelineSettings";
import { queryKeys } from "@/lib/api/query-keys";
import type { TimelinePageResponse } from "@/lib/api/timeline";

interface WholeFeedProps {
  initialData?: InfiniteData<TimelinePageResponse, string | undefined>;
}

export function WholeFeed({ initialData }: WholeFeedProps) {
  const {
    posts,
    hasNextPage,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isStale,
    dataUpdatedAt,
    showStaleBanner,
    fetchNextPage,
    refresh,
  } = useTimelineInfiniteQuery({
    queryKey: queryKeys.wholeTimeline(),
    endpoint: "/api/whole",
    initialData,
  });

  const { settings } = useTimelineSettings();

  const handleAutoUpdate = useCallback(() => {
    refresh();
  }, [refresh]);

  const { hasNewPosts, clearNewPosts } = useRealtimeTimeline({
    channelName: "whole-timeline",
    includeReposts: true,
    autoUpdate: settings.updateMode === "auto",
    onAutoUpdate: handleAutoUpdate,
  });

  const handleNewPostsClick = useCallback(() => {
    clearNewPosts();
    refresh();
  }, [clearNewPosts, refresh]);

  return (
    <TimelineFeedView
      posts={posts}
      hasMore={!!hasNextPage}
      isLoading={isLoading}
      isFetching={isFetching}
      isFetchingNextPage={isFetchingNextPage}
      isStale={isStale}
      dataUpdatedAt={dataUpdatedAt}
      showStaleBanner={showStaleBanner}
      hasNewPosts={hasNewPosts}
      emptyMessage={
        "表示できる投稿がありません。まだ投稿がないか、サーバーに接続できない可能性があります。"
      }
      onRefresh={refresh}
      onLoadMore={() => void fetchNextPage()}
      onNewPostsClick={handleNewPostsClick}
    />
  );
}
