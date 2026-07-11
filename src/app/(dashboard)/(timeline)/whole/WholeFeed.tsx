"use client";

import { useCallback } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import { useTimelineInfiniteQuery } from "@/app/_hooks/useTimelineInfiniteQuery";
import { TimelineFeedView } from "@/app/_components/TimelineFeedView";
import { useRealtimeTimeline } from "@/app/_hooks/useRealtimeTimeline";
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
    isFetchingNextPage,
    fetchNextPage,
    refresh,
  } = useTimelineInfiniteQuery({
    queryKey: queryKeys.wholeTimeline(),
    endpoint: "/api/whole",
    initialData,
  });

  const handleAutoUpdate = useCallback(() => {
    refresh();
  }, [refresh]);

  useRealtimeTimeline({
    channelName: "whole-timeline",
    includeReposts: true,
    onAutoUpdate: handleAutoUpdate,
  });

  return (
    <TimelineFeedView
      posts={posts}
      hasMore={!!hasNextPage}
      isLoading={isLoading}
      isFetchingNextPage={isFetchingNextPage}
      emptyMessage={
        "表示できる投稿がありません。まだ投稿がないか、サーバーに接続できない可能性があります。"
      }
      onRefresh={refresh}
      onLoadMore={() => void fetchNextPage()}
    />
  );
}
