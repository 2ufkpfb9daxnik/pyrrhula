"use client";

import { useState, useEffect, useRef } from "react";
import { Post } from "@/app/_components/post";
import { MakePost } from "@/app/_components/makepost";
import { Search } from "@/app/_components/search";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Plus, RefreshCw, Bell } from "lucide-react";
import type { Post as PostType } from "@/app/_types/post";
import { toast } from "sonner";

export default function WholePage() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const postInputRef = useRef<HTMLTextAreaElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // プルダウンリフレッシュ用の状態
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

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
  useEffect(() => {
    // モバイルでのみ有効化
    if (!isMobile || !contentRef.current) return;

    const content = contentRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      // スクロール位置がトップにある場合のみプルダウンを有効化
      if (window.scrollY <= 0) {
        touchStartRef.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartRef.current;

      // 下方向へのスワイプ時のみ処理（上方向は無視）
      if (distance > 0) {
        // 引っ張る感覚を出すために減衰させる
        const dampedDistance = Math.min(distance * 0.5, 100);
        setPullDistance(dampedDistance);

        // スクロールを防止
        if (dampedDistance > 5) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling) return;

      if (pullDistance > 50) {
        // 十分な距離を引っ張られたら更新する
        handleShowNewPosts();
      }

      // リセット
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
  }, [isPulling, isMobile]);

  // 初回読み込み
  useEffect(() => {
    fetchPosts();
  }, []);

  // 自動更新の設定
  useEffect(() => {
    // ユーザーがページを見ているかどうかの確認
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && autoRefresh) {
        // ページが表示されたら直ちに更新
        checkForNewPosts(true);
        // インターバルを再開
        startAutoRefresh();
      } else {
        // ページが非表示になったらインターバルを停止
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      }
    };

    const startAutoRefresh = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // 30秒ごとに新しい投稿をチェック
      refreshIntervalRef.current = setInterval(() => {
        checkForNewPosts(false);
      }, 30000);
    };

    // 自動更新が有効で、ページが表示されている場合のみインターバルを開始
    if (autoRefresh && document.visibilityState === "visible") {
      startAutoRefresh();
    }

    // イベントリスナーの登録
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // クリーンアップ関数
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, lastUpdateTime]);

  // 新しい投稿があるかチェック
  const checkForNewPosts = async (fetchImmediately = false) => {
    try {
      // this_timeline 用のエンドポイントを使用
      const response = await fetch(
        `/api/posts?since=${lastUpdateTime.toISOString()}&includeReposts=true&countOnly=${!fetchImmediately}`,
        { next: { revalidate: 0 } }
      );

      if (!response.ok) {
        throw new Error("新規投稿の確認に失敗しました");
      }

      const data = await response.json();

      if (fetchImmediately && data.posts && data.posts.length > 0) {
        // 即時読み込みモード
        setIsRefreshing(true);

        const newPosts = data.posts.filter(
          (newPost: any) =>
            !posts.some((existingPost) => {
              // リポスト情報も考慮して重複チェック
              if (!newPost.repostedBy) {
                return existingPost.id === newPost.id;
              }
              return (
                existingPost.id === newPost.id &&
                existingPost.repostedBy?.id === newPost.repostedBy?.id
              );
            })
        );

        if (newPosts.length > 0) {
          // 新しい投稿を既存の投稿リストの先頭に追加
          setPosts((prevPosts) => [...newPosts, ...prevPosts]);
          setNewPostsCount(0);
          setLastUpdateTime(new Date());

          // 通知を表示
          if (newPosts.length === 1) {
            toast.success("新しい投稿を表示しました");
          } else {
            toast.success(`${newPosts.length}件の新しい投稿を表示しました`);
          }
        }

        setIsRefreshing(false);
      } else if (!fetchImmediately && data.count) {
        // カウントのみモード - 新着投稿数を表示
        setNewPostsCount(data.count);
      }
    } catch (error) {
      console.error("Error checking for new posts:", error);
      if (fetchImmediately) {
        setIsRefreshing(false);
      }
    }
  };

  // 新着投稿を表示するボタンがクリックされたとき
  const handleShowNewPosts = () => {
    checkForNewPosts(true);
  };

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
        // rキーで最新の投稿を取得
        e.preventDefault();
        handleShowNewPosts();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // APIレスポンスの投稿データをフォーマットするヘルパー関数
  const formatPost = (post: any): PostType => {
    // repostedByUserIdが存在する場合、repostedByオブジェクトを構築
    let repostedBy = undefined;

    if (post.repostedBy) {
      // すでにrepostedByオブジェクトが存在する場合はそのまま使用
      repostedBy = post.repostedBy;
    } else if (post.repostedByUserId && post.repostedByUser) {
      // repostedByUserIdとrepostedByUserが存在する場合は構築
      repostedBy = {
        id: post.repostedByUser.id || post.repostedByUserId,
        username: post.repostedByUser.username || "",
        icon: post.repostedByUser.icon || null,
      };
    } else if (post.repostedByUserId) {
      // repostedByUserIdのみ存在する場合は最低限の情報を設定
      repostedBy = {
        id: post.repostedByUserId,
        username: "ユーザー", // プレースホルダー
        icon: null,
      };
    }

    return {
      ...post,
      createdAt: new Date(post.createdAt),
      repostedAt: post.repostedAt ? new Date(post.repostedAt) : undefined,
      favoritedAt: post.favoritedAt ? new Date(post.favoritedAt) : undefined,
      // 拡散された投稿であれば、repostedByを設定
      repostedBy: repostedBy,
      // 元の投稿がある場合はoriginalPostを設定
      originalPost: post.originalPost
        ? {
            ...post.originalPost,
            createdAt: new Date(post.originalPost.createdAt),
            user: post.originalPost.user,
          }
        : undefined,
      // 画像配列の確保
      images: post.images || [],
    };
  };

  // 新しい投稿のみを取得する関数
  const fetchLatestPosts = async () => {
    try {
      const response = await fetch(
        `/api/whole?since=${lastUpdateTime.toISOString()}&includeReposts=true`,
        { next: { revalidate: 60 } }
      );
      if (!response.ok) {
        throw new Error("新規投稿の取得に失敗しました");
      }

      const data = await response.json();
      if (data.posts.length > 0) {
        setPosts((prevPosts) => {
          // 一時的な投稿と重複を除去
          const uniquePosts = data.posts
            .map((post: any) => formatPost(post))
            .filter(
              (newPost: PostType) =>
                !newPost.id.startsWith("temp-") &&
                !prevPosts.some((existingPost) => {
                  // 通常の投稿の場合はIDで重複チェック
                  if (!newPost.repostedBy) {
                    return existingPost.id === newPost.id;
                  }
                  // 拡散の場合は投稿ID + 拡散者IDで重複チェック
                  return (
                    existingPost.id === newPost.id &&
                    existingPost.repostedBy?.id === newPost.repostedBy?.id
                  );
                })
            );

          return [...uniquePosts, ...prevPosts];
        });
        setLastUpdateTime(new Date());
      }
    } catch (error) {
      console.error("Error fetching new posts:", error);
    }
  };

  // 投稿取得
  const fetchPosts = async (cursor?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (cursor) {
        params.append("cursor", cursor);
      }

      params.append("includeReposts", "true");

      const response = await fetch(`/api/posts?${params}`, {
        next: { revalidate: 0 },
      });
      if (!response.ok) {
        throw new Error("投稿の取得に失敗しました");
      }

      const data = await response.json();

      if (cursor) {
        // 追加読み込み
        setPosts((prev) => [
          ...prev,
          ...data.posts.map((post: any) => formatPost(post)),
        ]);
      } else {
        // 初回読み込み
        setPosts(data.posts.map((post: any) => formatPost(post)));
      }

      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
      setLastUpdateTime(new Date());
      setNewPostsCount(0);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("投稿の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };
  const handleSearch = async (query: string) => {
    try {
      const response = await fetch(
        `/api/posts/search?q=${encodeURIComponent(query)}&includeReposts=true`,
        { next: { revalidate: 60 } }
      );
      if (!response.ok) {
        throw new Error("検索に失敗しました");
      }
      const data = await response.json();
      setPosts(data.posts.map((post: any) => formatPost(post)));
    } catch (error) {
      console.error("Error searching posts:", error);
    }
  };

  // 投稿作成成功時のハンドラ
  const handlePostCreated = (newPost: PostType) => {
    setPosts((prev) => {
      const filtered = prev.filter((p) => !p.id.startsWith("temp-"));
      return [newPost, ...filtered];
    });
    // 新しい投稿を作成したら、最終更新時刻も更新
    setLastUpdateTime(new Date());
  };

  const handleFavoriteSuccess = (
    postId: string,
    newCount: number,
    isFavorited: boolean
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
          : post
      )
    );
  };

  const handleRepostSuccess = (
    postId: string,
    newCount: number,
    isReposted: boolean
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
          : post
      )
    );
  };

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className="size-20 animate-spin text-gray-500" />
      </div>
    );
  }

  // プルダウンインジケーターのスタイル
  const pullRefreshStyle = {
    height: `${pullDistance}px`,
    opacity: pullDistance > 10 ? Math.min(pullDistance / 50, 1) : 0,
    transition: isPulling ? "none" : "all 0.3s ease",
  };

  return (
    <>
      <div className="hidden md:block md:w-80"></div>
      <div className="flex-1 pb-16 md:pb-0">
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
            {/* 新しい投稿のお知らせボタン */}
            {newPostsCount > 0 && (
              <div className="sticky top-0 z-10 animate-pulse">
                <Button
                  onClick={handleShowNewPosts}
                  variant="default"
                  className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-full py-2"
                >
                  <Bell className="size-4" />
                  {newPostsCount}件の新しい投稿を表示
                </Button>
              </div>
            )}

            {/* 自動更新の切り替えスイッチ - デスクトップのみ表示 */}
            {!isMobile && (
              <div className="flex items-center justify-end">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-400">
                  <span>自動更新</span>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={() => setAutoRefresh(!autoRefresh)}
                    className="size-4 rounded border-gray-600 bg-gray-800 accent-primary"
                  />
                </label>
              </div>
            )}

            {/* デバッグ情報 (開発中のみ表示) */}
            {process.env.NODE_ENV === "development" && (
              <div className="mb-4 rounded border border-yellow-500 bg-yellow-500/10 p-2 text-xs">
                <p>デバッグ情報: {posts.length}件の投稿</p>
                <p>拡散投稿: {posts.filter((p) => p.repostedBy).length}件</p>
                <details>
                  <summary>詳細データ (一部)</summary>
                  <pre>{JSON.stringify(posts.slice(0, 2), null, 2)}</pre>
                </details>
              </div>
            )}

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
                {posts.map((post) => (
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

            {/* もっと読み込むボタン */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={() => fetchPosts(nextCursor)}
                  disabled={isLoading}
                  className="w-full max-w-xs"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <LoaderCircle className="size-4 animate-spin" />
                      読み込み中...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="size-4" />
                      もっと読み込む
                    </div>
                  )}
                </Button>
              </div>
            )}
          </div>
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
    </>
  );
}
