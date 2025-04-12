"use client";

import { useMemo, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { LoaderCircle } from "lucide-react";
import { PostList } from "@/app/_components/PostList";
import { Button } from "@/components/ui/button";

interface ListTimelineProps {
  listId: string;
}

export function ListTimeline({ listId }: ListTimelineProps) {
  const { ref, inView } = useInView();

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

      const res = await fetch(
        `/api/lists/${listId}/timeline?${searchParams.toString()}`
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
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
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
          ) : (
            <Button
              variant="ghost"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              もっと読み込む
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
