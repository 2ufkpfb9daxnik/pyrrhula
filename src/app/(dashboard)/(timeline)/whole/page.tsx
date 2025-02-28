"use client";

import { useState, useEffect, useRef } from "react";
import { Post } from "@/app/_components/post";
import { MakePost } from "@/app/_components/makepost";
import { Search } from "@/app/_components/search";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LoaderCircle, Plus, RefreshCw } from "lucide-react";
import type { Post as PostType } from "@/app/_types/post";

export default function WholePage() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const postInputRef = useRef<HTMLTextAreaElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  useEffect(() => {
    fetchPosts();
  }, []);

  // キーボードショートカットのイベントリスナー
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

  const fetchPosts = async (cursor?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (cursor) {
        params.append("cursor", cursor);
      }

      // 拡散も含めるパラメータを追加
      params.append("includeReposts", "true");

      console.log(`全体タイムライン: /api/whole?${params} をフェッチします`);

      const response = await fetch(`/api/whole?${params}`, {
        next: { revalidate: 60 }, // 60秒間キャッシュ
      });
      if (!response.ok) {
        throw new Error("投稿の取得に失敗しました");
      }

      const data = await response.json();

      // デバッグ: APIレスポンスを確認
      console.log("API Response:", data.posts.slice(0, 2));
      interface ApiPostResponse {
        repostedBy?: {
          id: string;
          username: string;
          icon: string | null;
        };
      }

      console.log(
        "拡散投稿が含まれているか:",
        data.posts.some((p: ApiPostResponse) => p.repostedBy)
          ? "はい"
          : "いいえ"
      );

      if (cursor) {
        // 追加読み込みの場合は既存の投稿に追加
        setPosts((prev) => [
          ...prev,
          ...data.posts.map((post: any) => formatPost(post)),
        ]);
      } else {
        // 初回読み込みの場合は置き換え
        setPosts(data.posts.map((post: any) => formatPost(post)));
      }

      // デバッグ: フォーマット後の投稿を確認
      const formattedPosts = data.posts.map((post: any) => formatPost(post));
      console.log("フォーマット後の投稿:", formattedPosts.slice(0, 2));
      console.log(
        "拡散投稿数:",
        formattedPosts.filter((p: PostType) => p.repostedBy).length
      );

      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);

      // 最新の取得時間を更新
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error("Error fetching posts:", error);
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

  const handlePostCreated = (newPost: PostType) => {
    setPosts((prev) => {
      // 一時的な投稿（temp-で始まるID）を削除
      const filtered = prev.filter((p) => !p.id.startsWith("temp-"));
      return [newPost, ...filtered];
    });
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

  return (
    <>
      <div className="hidden md:block md:w-80"></div>
      <div className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-2xl p-4">
          <div className="space-y-4">
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
