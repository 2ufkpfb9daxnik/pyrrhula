"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Post } from "@/app/_components/post";
import { MakePost } from "@/app/_components/makepost";
import { StaleRefreshBanner } from "@/app/_components/StaleRefreshBanner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Post as PostType } from "@/app/_types/post";
import type { FormattedTimelinePost } from "@/lib/api/timeline";
import { upsertPostInTimelines } from "@/lib/timeline-cache";

interface TimelineFeedViewProps {
  posts: FormattedTimelinePost[];
  hasMore: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isStale: boolean;
  dataUpdatedAt: number;
  showStaleBanner: boolean;
  hasNewPosts?: boolean;
  emptyMessage: string;
  onRefresh: () => void;
  onLoadMore: () => void;
  onNewPostsClick?: () => void;
  onPostCreated?: (post: PostType) => void;
  enablePullRefresh?: boolean;
  showMobilePostButton?: boolean;
}

export function TimelineFeedView({
  posts,
  hasMore,
  isLoading,
  isFetching,
  isFetchingNextPage,
  isStale,
  dataUpdatedAt,
  showStaleBanner,
  hasNewPosts = false,
  emptyMessage,
  onRefresh,
  onLoadMore,
  onNewPostsClick,
  onPostCreated,
  enablePullRefresh = true,
  showMobilePostButton = true,
}: TimelineFeedViewProps) {
  const queryClient = useQueryClient();
  const postInputRef = useRef<HTMLTextAreaElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const hasEnteredLoadMoreRef = useRef(false);
  const { ref: loadMoreRef, inView: isLoadMoreInView } = useInView({
    rootMargin: "0px 0px",
  });

  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartRef = useRef(0);
  const isPullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  useEffect(() => {
    if (!enablePullRefresh || !isMobile || !contentRef.current) return;

    const content = contentRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        touchStartRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current) return;
      const distance = e.touches[0].clientY - touchStartRef.current;
      if (distance > 0) {
        const dampedDistance = Math.min(distance * 0.5, 100);
        pullDistanceRef.current = dampedDistance;
        setPullDistance(dampedDistance);
        if (dampedDistance > 5) e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!isPullingRef.current) return;
      if (pullDistanceRef.current > 50) onRefresh();
      pullDistanceRef.current = 0;
      isPullingRef.current = false;
      setPullDistance(0);
      setIsPulling(false);
    };

    content.addEventListener("touchstart", handleTouchStart, { passive: true });
    content.addEventListener("touchmove", handleTouchMove, { passive: false });
    content.addEventListener("touchend", handleTouchEnd);
    return () => {
      content.removeEventListener("touchstart", handleTouchStart);
      content.removeEventListener("touchmove", handleTouchMove);
      content.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enablePullRefresh, isMobile, onRefresh]);

  useEffect(() => {
    const entered = isLoadMoreInView && !hasEnteredLoadMoreRef.current;
    if (entered && hasMore && !isFetchingNextPage && !isLoading) {
      onLoadMore();
    }
    hasEnteredLoadMoreRef.current = isLoadMoreInView;
  }, [isLoadMoreInView, hasMore, isFetchingNextPage, isLoading, onLoadMore]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === "n" &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setIsDialogOpen(true);
          setTimeout(() => postInputRef.current?.focus(), 100);
        } else {
          postInputRef.current?.focus();
        }
      } else if (
        e.key === "r" &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        e.preventDefault();
        onRefresh();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onRefresh]);

  const handlePostCreated = useCallback(
    (newPost: PostType) => {
      upsertPostInTimelines(queryClient, newPost);
      onPostCreated?.(newPost);
    },
    [queryClient, onPostCreated],
  );

  const pullRefreshStyle = {
    height: `${pullDistance}px`,
    opacity: pullDistance > 10 ? Math.min(pullDistance / 50, 1) : 0,
    transition: isPulling ? "none" : "all 0.3s ease",
  };

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className="size-12 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div ref={contentRef}>
      {hasNewPosts && onNewPostsClick && (
        <div className="sticky top-0 z-30 flex justify-center px-4 py-2">
          <button
            onClick={onNewPostsClick}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
          >
            ↑ 新しい投稿があります
          </button>
        </div>
      )}

      {showStaleBanner && (
        <StaleRefreshBanner
          isStale={isStale}
          isFetching={isFetching}
          dataUpdatedAt={dataUpdatedAt}
          onRefresh={onRefresh}
        />
      )}

      {enablePullRefresh && isMobile && (
        <div
          className="flex items-center justify-center overflow-hidden py-2"
          style={pullRefreshStyle}
        >
          <LoaderCircle
            className={`size-8 ${pullDistance > 50 ? "animate-spin" : ""} text-gray-400`}
          />
        </div>
      )}

      <div className="mx-auto max-w-2xl p-4">
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-lg border border-gray-800 p-8 text-center">
              <p className="text-gray-500">{emptyMessage}</p>
            </div>
          ) : (
            posts.map((post) => (
              <Post
                key={
                  post.id +
                  (post.repostedBy
                    ? `-repost-${post.repostedBy.id}`
                    : String(post.repostedAt ?? ""))
                }
                post={post}
              />
            ))
          )}

          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isFetchingNextPage ? (
                <LoaderCircle className="size-5 animate-spin text-gray-500" />
              ) : (
                <span className="text-sm text-gray-500">
                  下へスクロールして読み込み
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {showMobilePostButton && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="fixed bottom-20 right-4 z-[45] size-14 rounded-full p-0 shadow-lg md:hidden"
              variant="default"
            >
              <Plus className="size-6" />
            </Button>
          </DialogTrigger>
          <DialogContent
            hideCloseButton
            className="!inset-x-0 !top-12 !w-screen !max-w-none !translate-x-0 !translate-y-0 rounded-none border-x-0 p-0"
          >
            <DialogTitle className="sr-only">新規投稿</DialogTitle>
            <div className="overflow-y-auto pb-4">
              <MakePost
                onPostCreated={(post) => {
                  handlePostCreated(post);
                  if (post.id.startsWith("temp-")) setIsDialogOpen(false);
                }}
                inputRef={postInputRef}
                noBorder
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
