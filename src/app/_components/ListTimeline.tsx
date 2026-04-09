"use client";

import { useMemo, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { LoaderCircle } from "lucide-react";
import { PostList } from "@/app/_components/PostList";

interface ListTimelineProps {
  listId: string;
}

export function ListTimeline({ listId }: ListTimelineProps) {
  const { ref, inView } = useInView();
  const hasEnteredLoadMoreRef = useRef(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["listTimeline", listId],
    queryFn: async ({ pageParam }) => {
      const searchParams = new URLSearchParams();
      if (pageParam) searchParams.set("cursor", pageParam);
      searchParams.set("limit", "10");

      const res = await fetch(
        `/api/lists/${listId}/timeline?${searchParams.toString()}`,
      );
      if (!res.ok) throw new Error("タイムラインの取得に失敗しました");
      return res.json();
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.posts);
  }, [data]);

  // 無限スクロールの設定
  useEffect(() => {
    const entered = inView && !hasEnteredLoadMoreRef.current;
    if (entered && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
    hasEnteredLoadMoreRef.current = inView;
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
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
