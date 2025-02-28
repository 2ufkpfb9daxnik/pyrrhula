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
    return {
      ...post,
      createdAt: new Date(post.createdAt),
      repostedAt: post.repostedAt ? new Date(post.repostedAt) : undefined,
      favoritedAt: post.favoritedAt ? new Date(post.favoritedAt) : undefined,
      // 拡散された投稿であれば、repostedByを設定
      repostedBy: post.repostedBy
        ? {
            id: post.repostedBy.id,
            username: post.repostedBy.username,
            icon: post.repostedBy.icon || null,
          }
        : undefined,
      // 元の投稿がある場合はoriginalPostを設定
      originalPost: post.originalPost
        ? {
            ...post.originalPost,
            createdAt: new Date(post.originalPost.createdAt),
            user: post.originalPost.user,
          }
        : undefined,
      // 画像配列を確保
      images: post.images || [],
    };
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

      const response = await fetch(`/api/whole?${params}`, {
        next: { revalidate: 60 }, // 60秒間キャッシュ
      });
      if (!response.ok) {
        throw new Error("投稿の取得に失敗しました");
      }

      const data = await response.json();

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

      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostCreated = (newPost: PostType) => {
    setPosts((prev) => {
      // 一時的な投稿（temp-で始まるID）を削除
      const filtered = prev.filter((p) => !p.id.startsWith("temp-"));

      // 新しい投稿を先頭に追加
      return [newPost, ...filtered];
    });
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
      setHasMore(false);
      setNextCursor(undefined);
    } catch (error) {
      console.error("Error searching posts:", error);
    }
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
      {/* 左サイドバー */}
      <div className="fixed left-16 top-0 hidden h-full w-80 flex-col gap-4 border-r border-gray-800 p-4 md:flex">
        <MakePost onPostCreated={handlePostCreated} inputRef={postInputRef} />
        <Search onSearch={handleSearch} />
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-2xl p-4 md:ml-96">
          {/* モバイル用検索バー */}
          <div className="mb-4 flex items-center justify-between border-b border-gray-800 pb-4 md:hidden">
            <Search onSearch={handleSearch} />
          </div>

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
              posts.map((post) => (
                <Post
                  key={post.id + (post.repostedAt?.toString() || "")}
                  post={post}
                  onRepostSuccess={(newCount, isReposted) => {
                    setPosts((prev) =>
                      prev.map((p) =>
                        p.id === post.id
                          ? { ...p, reposts: newCount, isReposted }
                          : p
                      )
                    );
                  }}
                  onFavoriteSuccess={(newCount, isFavorited) => {
                    setPosts((prev) =>
                      prev.map((p) =>
                        p.id === post.id
                          ? { ...p, favorites: newCount, isFavorited }
                          : p
                      )
                    );
                  }}
                />
              ))
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
