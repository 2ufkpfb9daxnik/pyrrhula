"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Post } from "@/app/_components/post";
import { MakePost } from "@/app/_components/makepost";
import { Search } from "@/app/_components/search";
import { Navigation } from "@/app/_components/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface Post {
  id: string;
  content: string;
  createdAt: Date;
  favorites: number;
  reposts: number;
  user: {
    id: string;
    username: string;
    icon: string | null;
  };
  _count: {
    replies: number;
  };
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
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

      if (cursor) {
        // 追加読み込みの場合は既存の投稿に追加
        setPosts((prev) => [
          ...prev,
          ...data.posts.map((post: any) => ({
            ...post,
            createdAt: new Date(post.createdAt),
          })),
        ]);
      } else {
        // 初回読み込みの場合は置き換え
        setPosts(
          data.posts.map((post: any) => ({
            ...post,
            createdAt: new Date(post.createdAt),
          }))
        );
      }

      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
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
        {/* 左サイドバー - モバイルでは非表示 */}
        <div className="fixed left-16 top-0 hidden h-full w-80 flex-col gap-4 border-r border-gray-800 p-4 md:flex">
          <MakePost onPostCreated={() => fetchPosts()} />
          <Search onSearch={handleSearch} />
        </div>

        {/* メインコンテンツ - モバイルではフル幅 */}
        <main className="flex-1">
          <div className="mx-auto max-w-2xl p-4 md:ml-[calc(50%-21rem)]">
            <div className="space-y-4">
              {posts.map((post) => (
                <Post key={post.id} post={post} />
              ))}

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
                        <Spinner className="sm" />
                        読み込み中...
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
