"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTimelineInfiniteQuery } from "@/app/_hooks/useTimelineInfiniteQuery";
import { TimelineFeedView } from "@/app/_components/TimelineFeedView";
import { useRealtimeTimeline } from "@/app/_hooks/useRealtimeTimeline";
import { useTimelineSettings } from "@/app/_hooks/useTimelineSettings";
import { queryKeys } from "@/lib/api/query-keys";

export default function HomePage() {
  const { data: session } = useSession();

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
    queryKey: queryKeys.homeTimeline(),
    endpoint: "/api/posts",
    extraParams: { includeRepostedByUser: "true" },
    enabled: !!session,
  });

  const { settings } = useTimelineSettings();

  const handleAutoUpdate = useCallback(() => refresh(), [refresh]);

  const { hasNewPosts, clearNewPosts } = useRealtimeTimeline({
    channelName: "home-timeline",
    autoUpdate: settings.updateMode === "auto",
    onAutoUpdate: handleAutoUpdate,
  });

  const handleNewPostsClick = useCallback(() => {
    clearNewPosts();
    refresh();
  }, [clearNewPosts, refresh]);

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-gray-800 p-8 text-center">
          <p className="text-gray-500">
            タイムラインを表示するには
            <Link href="/login" className="text-primary">
              ログイン
            </Link>
            が必要です
          </p>
        </div>
      </div>
    );
  }

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
      emptyMessage="まだ投稿がありません。フォローしているユーザーの投稿がここに表示されます。"
      onRefresh={refresh}
      onLoadMore={() => void fetchNextPage()}
      onNewPostsClick={handleNewPostsClick}
    />
  );
}
