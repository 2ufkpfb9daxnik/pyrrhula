"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { PostProps } from "@/app/_types/post";
import type { Post } from "@/app/_types/post";
import { MakePost } from "@/app/_components/makepost";
import { Search } from "@/app/_components/search";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }
    fetchPosts();
  }, [session, router]);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/posts/timeline");
      if (!response.ok) {
        throw new Error("Failed to fetch timeline");
      }
      const data = await response.json();
      setPosts(
        data.posts.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt),
        }))
      );
    } catch (error) {
      console.error("Error fetching timeline:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    try {
      const response = await fetch(
        `/api/posts/search?q=${encodeURIComponent(query)}&timeline=true`
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
    } catch (error) {
      console.error("Error searching posts:", error);
    }
  };

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">
          タイムラインを表示するにはログインが必要です
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <>
      {/* 左サイドバー */}
      <div className="fixed left-16 top-0 flex h-full w-80 flex-col gap-4 border-r border-gray-800 p-4">
        <MakePost onPostCreated={fetchPosts} />
        <Search onSearch={handleSearch} />
      </div>
      {/* メインコンテンツ */}
      <main className="flex-1">
        <div
          className="mx-auto max-w-2xl p-4"
          style={{ marginLeft: "calc(50% - 21rem)" }}
        >
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="rounded-lg border border-gray-800 p-8 text-center">
                <p className="text-gray-500">
                  まだ投稿がありません。
                  <br />
                  フォローしているユーザーの投稿がここに表示されます。
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <PostProps
                  key={post.id}
                  post={post}
                  onRepostSuccess={fetchPosts}
                  onFavoriteSuccess={fetchPosts}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
