"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { PostProps } from "@/app/_types/post";
import type { Post } from "@/app/_types/post";
import { Post as PostComponent } from "@/app/_components/post"; // PostコンポーネントをPostComponentとしてインポート
import { MakePost } from "@/app/_components/makepost";
import { Search } from "@/app/_components/search";

interface UserInfo {
  icon: string | null;
  username: string;
  id: string;
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  const handleUserClick = () => {
    if (session?.user?.id) {
      router.push(`/user/${session.user.id}`);
    }
  };

  useEffect(() => {
    if (!session) {
      return;
    }
    fetchUserInfo();
    fetchPosts();
  }, [session]);

  const fetchUserInfo = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/users/${session.user.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user info");
      }

      const data = await response.json();
      setUserInfo(data);
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/posts/");
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
    <div className="flex min-h-screen">
      {/* 左サイドバー */}
      <div className="fixed left-16 top-0 flex h-full w-80 flex-col gap-4 border-r border-gray-800 p-4">
        {/* ユーザー情報 */}
        <button
          onClick={handleUserClick}
          className="flex w-full items-start space-x-3 border-b border-gray-800 pb-4 text-left transition-colors hover:bg-gray-800/50"
        >
          <div className="flex items-start space-x-3 border-gray-800 ">
            <Avatar className="size-12">
              <AvatarImage src={session?.user?.image ?? undefined} />
              <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold">{session?.user?.name}</span>
              <span className="text-sm text-muted-foreground">
                @{session?.user?.id}
              </span>
            </div>
          </div>
        </button>
        <MakePost onPostCreated={fetchPosts} />
        <Search onSearch={handleSearch} />
      </div>
      {/* メインコンテンツ */}
      <main className="flex-1">
        <div className="mx-auto max-w-2xl p-4 lg:ml-96">
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
                <PostComponent
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
    </div>
  );
}
