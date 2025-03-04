"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  LoaderCircle,
  Star,
  RefreshCw,
  Activity,
  Users,
  Calendar,
} from "lucide-react";
import { Post } from "@/app/_components/post";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Post as PostType } from "@/app/_types/post";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState("timeline");

  useEffect(() => {
    if (activeTab === "timeline") {
      fetchPosts();
    }
  }, [activeTab]);

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

          {/* 機能タブ */}
          <Tabs
            defaultValue="timeline"
            className="w-full"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rating">レーティング</TabsTrigger>
              <TabsTrigger value="timeline">全体タイムライン</TabsTrigger>
            </TabsList>
          </Tabs>

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

      {/* 右側：タイムライン または レーティング情報 */}
      <div className="w-full border-t border-gray-800 md:ml-[50%] md:min-h-screen md:w-1/2 md:border-l md:border-t-0">
        <div className="container mx-auto max-w-2xl px-4 py-6">
          {activeTab === "timeline" ? (
            <>
              <h2 className="mb-4 text-xl font-bold">公開タイムライン</h2>
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
            </>
          ) : (
            <div className="space-y-8">
              <h2 className="mb-4 text-xl font-bold">レーティング</h2>

              <div className="rounded-lg border p-6">
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  鷽のレーティングは、ユーザーの活動量と質を評価する指標です。投稿数や反応の数など、複数の要素から総合的に算出されます。
                  アクティブで質の高い投稿を行うユーザーほど、高いレーティングが付与されます。
                </p>
                <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2 md:grid-cols-3">
                  <div className="flex flex-col items-center rounded-md border p-3">
                    <span className="text-gray-300">白</span>
                    <span className="text-xs text-muted-foreground">
                      1点未満
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border p-3">
                    <span className="text-gray-500">灰</span>
                    <span className="text-xs text-muted-foreground">
                      1〜2点
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border p-3">
                    <span className="text-amber-700">茶</span>
                    <span className="text-xs text-muted-foreground">
                      3〜6点
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border p-3">
                    <span className="text-lime-500">黄緑</span>
                    <span className="text-xs text-muted-foreground">
                      7〜14点
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border p-3">
                    <span className="text-green-500">緑</span>
                    <span className="text-xs text-muted-foreground">
                      15〜30点
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border p-3">
                    <span className="text-cyan-500">水</span>
                    <span className="text-xs text-muted-foreground">
                      31〜61点
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border p-3">
                    <span className="text-blue-500">青</span>
                    <span className="text-xs text-muted-foreground">
                      62〜249点
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border p-3">
                    <span className="text-purple-500">紫</span>
                    <span className="text-xs text-muted-foreground">
                      250〜999点
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border p-3">
                    <span className="text-yellow-500">黄</span>
                    <span className="text-xs text-muted-foreground">
                      1000〜4999点
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border p-3">
                    <span className="text-orange-500">橙</span>
                    <span className="text-xs text-muted-foreground">
                      5000〜29999点
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border p-3">
                    <span className="text-red-500">赤</span>
                    <span className="text-xs text-muted-foreground">
                      30000点以上
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-6">
                <h3 className="mb-4 text-lg font-medium">
                  レーティングの計算方法
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 rounded-md border p-3">
                    <Activity className="size-5 text-blue-500" />
                    <div>
                      <h4 className="font-medium">基本スコア</h4>
                      <p className="text-sm text-muted-foreground">
                        最近の投稿数 × 10 + 過去の投稿の平方根 × 15
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 rounded-md border p-3">
                    <RefreshCw className="size-5 text-green-500" />
                    <div>
                      <h4 className="font-medium">拡散ボーナス</h4>
                      <p className="text-sm text-muted-foreground">
                        最近の拡散数 × 5 + 総拡散数の平方根 × 7
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 rounded-md border p-3">
                    <Star className="size-5 text-yellow-500" />
                    <div>
                      <h4 className="font-medium">お気に入りボーナス</h4>
                      <p className="text-sm text-muted-foreground">
                        最近のお気に入り数の平方根 × 8 + 総お気に入り数の平方根
                        × 5
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 rounded-md border p-3">
                    <Users className="size-5 text-purple-500" />
                    <div>
                      <h4 className="font-medium">フォロワーボーナス</h4>
                      <p className="text-sm text-muted-foreground">
                        フォロワー数の平方根 × 10
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 rounded-md border p-3">
                    <Calendar className="size-5 text-orange-500" />
                    <div>
                      <h4 className="font-medium">アカウント年齢ボーナス</h4>
                      <p className="text-sm text-muted-foreground">
                        アカウント作成からの日数（対数） × 5
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-6">
                <h3 className="mb-4 text-lg font-medium">
                  レーティングを上げるには
                </h3>
                <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                  <li>定期的に投稿を行う（最近の投稿に高いウェイト）</li>
                  <li>質の高い投稿をして拡散やお気に入りを集める</li>
                  <li>他のユーザーの質の高い投稿を拡散する</li>
                  <li>コミュニティに積極的に参加してフォロワーを増やす</li>
                  <li>長期間アカウントを使い続ける（継続ボーナス）</li>
                </ul>
              </div>

              <div className="mt-6 text-center">
                <Button asChild>
                  <Link href="/signup">
                    アカウント作成してレーティングを始める
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
