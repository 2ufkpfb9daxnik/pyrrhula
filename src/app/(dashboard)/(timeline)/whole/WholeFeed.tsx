"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Post } from "@/app/_components/post";
import { MakePost } from "@/app/_components/makepost";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LoaderCircle, Plus } from "lucide-react";
import type { Post as PostType } from "@/app/_types/post";
import { toast } from "sonner";
import { useInView } from "react-intersection-observer";
import { useRealtimeTimeline } from "@/app/_hooks/useRealtimeTimeline";
import { useTimelineSettings } from "@/app/_hooks/useTimelineSettings";

interface WholeFeedProps {
  initialPostsRaw: any[];
  initialHasMore: boolean;
  initialNextCursor?: string;
}

// APIレスポンスの投稿データをフォーマットするヘルパー関数
const formatPost = (post: any): PostType => {
  let repostedBy = undefined;

  if (post.repostedBy) {
    repostedBy = post.repostedBy;
  } else if (post.repostedByUserId && post.repostedByUser) {
    repostedBy = {
      id: post.repostedByUser.id || post.repostedByUserId,
      username: post.repostedByUser.username || "",
      icon: post.repostedByUser.icon || null,
    };
  } else if (post.repostedByUserId) {
    repostedBy = {
      id: post.repostedByUserId,
      username: "ユーザー",
      icon: null,
    };
  }

  return {
    ...post,
    createdAt: new Date(post.createdAt),
    repostedAt: post.repostedAt ? new Date(post.repostedAt) : undefined,
    favoritedAt: post.favoritedAt ? new Date(post.favoritedAt) : undefined,
    repostedBy,
    originalPost: post.originalPost
      ? {
          ...post.originalPost,
          createdAt: new Date(post.originalPost.createdAt),
          user: post.originalPost.user,
        }
      : undefined,
    images: post.images || [],
  };
};

export function WholeFeed({
  initialPostsRaw,
  initialHasMore,
  initialNextCursor,
}: WholeFeedProps) {
  const [posts, setPosts] = useState<PostType[]>(() =>
    initialPostsRaw.map(formatPost),
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<string | undefined>(
    initialNextCursor,
  );
  const [isLoading, setIsLoading] = useState(false);
  const postInputRef = useRef<HTMLTextAreaElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const hasEnteredLoadMoreRef = useRef(false);
  const { ref: loadMoreRef, inView: isLoadMoreInView } = useInView({
    rootMargin: "0px 0px",
  });

  // プルダウンリフレッシュ用の状態
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartRef = useRef(0);
  // refs でミュータブルな状態を保持しイベントハンドラの再登録を防ぐ
  const isPullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // 投稿取得（useCallback でメモ化しエフェクトの依存配列に安全に含める）
  const fetchPosts = useCallback(
    async (cursor?: string, forceFresh = false) => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (cursor) {
          params.append("cursor", cursor);
        }

        params.append("limit", "10");
        params.append("includeReposts", "true");

        const response = await fetch(
          `/api/whole?${params}`,
          forceFresh ? { cache: "no-store" } : { next: { revalidate: 0 } },
        );
        if (!response.ok) {
          throw new Error("投稿の取得に失敗しました");
        }

        const data = await response.json();

        if (cursor) {
          setPosts((prev) => [
            ...prev,
            ...data.posts.map((post: any) => formatPost(post)),
          ]);
        } else {
          setPosts(data.posts.map((post: any) => formatPost(post)));
        }

        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      } catch (error) {
        console.error("Error fetching posts:", error);
        toast.error("投稿の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Supabase Realtime による新着投稿・拡散の検知
  const { settings } = useTimelineSettings();
  const isAutoUpdate = settings.updateMode === "auto";

  const handleAutoUpdate = useCallback(() => {
    fetchPosts(undefined, true).catch((err) => {
      console.error("Auto-update failed:", err);
    });
  }, [fetchPosts]);

  const { hasNewPosts, clearNewPosts } = useRealtimeTimeline({
    channelName: "whole-timeline",
    includeReposts: true,
    autoUpdate: isAutoUpdate,
    onAutoUpdate: handleAutoUpdate,
  });

  const handleNewPostsBannerClick = useCallback(() => {
    clearNewPosts();
    void fetchPosts(undefined, true);
  }, [clearNewPosts, fetchPosts]);

  // モバイル/デスクトップの判定
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  // プルダウンリフレッシュの実装
  // isPullingRef / pullDistanceRef を使うことで isMobile と fetchPosts が変わるときだけ再登録する
  useEffect(() => {
    if (!isMobile || !contentRef.current) return;

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

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartRef.current;

      if (distance > 0) {
        const dampedDistance = Math.min(distance * 0.5, 100);
        pullDistanceRef.current = dampedDistance;
        setPullDistance(dampedDistance);

        if (dampedDistance > 5) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isPullingRef.current) return;

      if (pullDistanceRef.current > 50) {
        void fetchPosts(undefined, true);
      }

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
  }, [isMobile, fetchPosts]);

  // 無限スクロール
  useEffect(() => {
    const entered = isLoadMoreInView && !hasEnteredLoadMoreRef.current;
    if (entered && hasMore && nextCursor && !isLoading) {
      void fetchPosts(nextCursor);
    }
    hasEnteredLoadMoreRef.current = isLoadMoreInView;
  }, [isLoadMoreInView, hasMore, nextCursor, isLoading, fetchPosts]);

  // キーボードショートカットの設定
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
          setTimeout(() => {
            postInputRef.current?.focus();
          }, 100);
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
        void fetchPosts(undefined, true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [fetchPosts]);

  // 投稿作成成功時のハンドラ
  const handlePostCreated = (newPost: PostType) => {
    setPosts((prev) => {
      const filtered = prev.filter((p) => !p.id.startsWith("temp-"));
      return [newPost, ...filtered];
    });

    if (!newPost.id.startsWith("temp-")) {
      void fetchPosts(undefined, true);
    }
  };

  const handleFavoriteSuccess = (
    postId: string,
    newCount: number,
    isFavorited: boolean,
  ) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              favorites: newCount,
              isFavorited,
              favoritedAt: isFavorited ? new Date() : undefined,
            }
          : post,
      ),
    );
  };

  const handleRepostSuccess = (
    postId: string,
    newCount: number,
    isReposted: boolean,
  ) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              reposts: newCount,
              isReposted,
              repostedAt: isReposted ? new Date() : undefined,
            }
          : post,
      ),
    );
  };

  // プルダウンインジケーターのスタイル
  const pullRefreshStyle = {
    height: `${pullDistance}px`,
    opacity: pullDistance > 10 ? Math.min(pullDistance / 50, 1) : 0,
    transition: isPulling ? "none" : "all 0.3s ease",
  };

  return (
    <div ref={contentRef}>
      {/* 新着投稿バナー */}
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

      {/* プルダウン時のローディングインジケーター */}
      {isMobile && (
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
              <p className="text-gray-500">
                表示できる投稿がありません。
                <br />
                まだ投稿がないか、サーバーに接続できない可能性があります。
              </p>
            </div>
          ) : (
            <>
              {posts
                .filter((post) => {
                  if (post.repostedBy) return true;

                  const isRepostedByOthers = posts.some(
                    (p) => p.repostedBy && p.id === post.id,
                  );
                  return !isRepostedByOthers;
                })
                .map((post) => (
                  <Post
                    key={
                      post.id +
                      (post.repostedBy
                        ? `-repost-${post.repostedBy.id}`
                        : post.repostedAt?.toString() || "")
                    }
                    post={post}
                    onRepostSuccess={(newCount, isReposted) =>
                      handleRepostSuccess(post.id, newCount, isReposted)
                    }
                    onFavoriteSuccess={(newCount, isFavorited) =>
                      handleFavoriteSuccess(post.id, newCount, isFavorited)
                    }
                  />
                ))}
            </>
          )}

          {/* 自動読み込み用センサー */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isLoading ? (
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

      {/* モバイル用投稿ボタン */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-20 right-4 size-14 rounded-full p-0 shadow-lg md:hidden"
            variant="default"
          >
            <Plus className="size-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-32px)] max-w-[425px]">
          <div className="pt-6">
            <MakePost
              onPostCreated={(post) => {
                handlePostCreated(post);
                setIsDialogOpen(false);
              }}
              inputRef={postInputRef}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
