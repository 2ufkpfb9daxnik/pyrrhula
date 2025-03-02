"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Post } from "@/app/_components/post";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Post as PostType } from "@/app/_types/post";

// 投稿の型定義
interface PostUser {
  id: string;
  username: string;
  icon: string | null;
}

interface TimelinePost {
  id: string;
  content: string;
  createdAt: Date;
  favorites: number;
  reposts: number;
  images?: string[];
  user: PostUser;
  parent: {
    id: string;
    content: string;
    user?: {
      id: string;
      username: string;
    };
  } | null;
  _count: {
    replies: number;
  };
  isFavorited: boolean;
  isReposted: boolean;
  repostedAt?: Date;
  repostedBy?: PostUser;
}

export default function LandingPage() {
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  // 全体タイムラインの投稿を取得する関数
  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/whole?limit=10&includeReposts=true", {
        next: { revalidate: 60 }, // 60秒間キャッシュ
      });

      if (!response.ok) {
        throw new Error("タイムラインの取得に失敗しました");
      }

      const data = await response.json();

      // 日付をDate型に変換して投稿を設定
      setPosts(
        data.posts.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt),
          repostedAt: post.repostedAt ? new Date(post.repostedAt) : undefined,
        }))
      );
    } catch (error) {
      console.error("Error fetching timeline:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Post コンポーネントに適合するように変換
  const formatForPostComponent = (post: TimelinePost): PostType => {
    return {
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      favorites: post.favorites,
      reposts: post.reposts,
      images: post.images || [], // 必ず配列を返すように
      user: post.user,
      parent: post.parent || undefined,
      _count: {
        replies: post._count.replies,
      },
      // 非ログイン時はfalse
      isFavorited: false,
      isReposted: false,
      // 拡散情報を保持
      repostedAt: post.repostedAt,
      repostedBy: post.repostedBy,
    };
  };

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* 左側：ランディングページ */}
      <div className="flex w-full flex-col items-center justify-center p-4 md:fixed md:left-0 md:h-screen md:w-1/2">
        <div className="flex max-w-xl flex-col items-center space-y-8 text-center">
          {/* ロゴとタイトル */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold md:text-6xl">鷽</h1>
            <h3 className="text-xl">レートのあるSNS</h3>
          </div>

          {/* 説明文 */}
          <div className="space-y-2 text-muted-foreground">
            <Link
              href="https://ja.wikipedia.org/wiki/%E3%82%A6%E3%82%BD"
              className="text-sm hover:underline"
            >
              ウソ（鷽、学名：Pyrrhula pyrrhula Linnaeus,
              1758）は、スズメ目アトリ科ウソ属に分類される鳥類の一種... ウソ -
              Wikipedia
            </Link>
            <br />
            <Link
              href="https://github.com/2ufkpfb9daxnik/pyrrhula"
              className="text-sm hover:underline"
            >
              GitHubリポジトリ
            </Link>
          </div>

          {/* 機能紹介 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <h3 className="font-medium">レーティング</h3>
              <p className="text-sm text-muted-foreground">
                投稿や活動によって評価が変わります
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <h3 className="font-medium">全体タイムライン</h3>
              <p className="text-sm text-muted-foreground">
                誰でも閲覧できる公開投稿を表示
              </p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex w-full flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
            <Button asChild size="default" className="w-full sm:min-w-[150px]">
              <Link href="/signup">新規登録</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="default"
              className="w-full sm:min-w-[150px]"
            >
              <Link href="/login">ログイン</Link>
            </Button>
          </div>

          {/* フッター */}
          <footer className="mt-6 text-xs text-muted-foreground">
            <p>© 2024 鷽. All rights reserved.</p>
          </footer>
        </div>
      </div>

      {/* 右側：タイムライン - デスクトップでは右側固定、モバイルでは下側に表示 */}
      <div className="w-full border-t border-gray-800 md:ml-[50%] md:min-h-screen md:w-1/2 md:border-l md:border-t-0">
        <div className="container mx-auto max-w-2xl px-4 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoaderCircle className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <TooltipProvider>
              <div className="divide-y divide-gray-700">
                {posts.map((post) => (
                  <Post key={post.id} post={formatForPostComponent(post)} />
                ))}
              </div>
            </TooltipProvider>
          )}

          {posts.length === 0 && !isLoading && (
            <div className="py-10 text-center text-muted-foreground">
              投稿がありません
            </div>
          )}

          <div className="mt-6 text-center">
            <Button asChild variant="outline">
              <Link href="/login">ログインしてもっと見る</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
