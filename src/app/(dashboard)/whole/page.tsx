"use client";

import { useState, useEffect, useRef } from "react";
import { Post } from "@/app/_components/post";
import { MakePost } from "@/app/_components/makepost";
import { Search } from "@/app/_components/search";
import { Navigation } from "@/app/_components/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LoaderCircle, Plus } from "lucide-react";
import type { Post as PostType } from "@/app/_types/post";

export default function HomePage() {
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

  const fetchPosts = async (cursor?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (cursor) {
        params.append("cursor", cursor);
      }

      const response = await fetch(`/api/whole?${params}`);
      if (!response.ok) {
        throw new Error("投稿の取得に失敗しました");
      }

      const data = await response.json();

      const formattedPosts = data.posts.map((post: any) => ({
        ...post,
        createdAt: new Date(post.createdAt),
        images: post.images || [],
      }));

      if (cursor) {
        setPosts((prev) => [...prev, ...formattedPosts]);
      } else {
        setPosts(formattedPosts);
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
        `/api/posts/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error("検索に失敗しました");
      }
      const data = await response.json();
      setPosts(
        data.posts.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt),
          images: post.images || [],
        }))
      );
      setHasMore(false);
      setNextCursor(undefined);
    } catch (error) {
      console.error("Error searching posts:", error);
    }
  };

  return (
    <TooltipProvider>
      <>
        <Navigation />
        {/* 左サイドバー */}
        <div className="fixed left-16 top-0 hidden h-full w-80 flex-col gap-4 border-r border-gray-800 p-4 md:flex">
          <MakePost onPostCreated={handlePostCreated} inputRef={postInputRef} />
          <Search onSearch={handleSearch} />
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1">
          <div className="mx-auto max-w-2xl p-4 md:ml-[calc(50%-21rem)]">
            <div className="space-y-4">
              {posts.map((post) => (
                <Post
                  key={post.id}
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
              ))}

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
                        <LoaderCircle className="animate-spin" />
                      </div>
                    ) : (
                      "もっと読み込む"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
      </>
    </TooltipProvider>
  );
}
