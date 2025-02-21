"use client";

import { Search } from "@/app/_components/search";
import { useState } from "react";
import { Post as PostComponent } from "@/app/_components/post";
import type { Post } from "@/app/_types/post";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

export default function SearchPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");

  const handleSearch = async (query: string) => {
    setCurrentQuery(query); // クエリを保存
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`
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

      if (data.posts.length === 0) {
        toast.info("検索結果が見つかりませんでした");
      }
    } catch (error) {
      console.error("Error searching posts:", error);
      toast.error("検索中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">検索</h1>
      <Search onSearch={handleSearch} />

      {/* 検索結果の表示 */}
      {isLoading ? (
        <div className="mt-8 text-center text-muted-foreground">検索中...</div>
      ) : posts.length > 0 ? (
        <div className="mt-8 space-y-4">
          {posts.map((post) => (
            <PostComponent
              key={post.id}
              post={post}
              onRepostSuccess={() => handleSearch(currentQuery)} // currentQueryを使用
              onFavoriteSuccess={() => handleSearch(currentQuery)} // currentQueryを使用
            />
          ))}
        </div>
      ) : null}

      <Accordion type="single" collapsible className="mt-8">
        <AccordionItem value="advanced-search">
          <AccordionTrigger>高度な検索オプション</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 text-sm text-muted-foreground">
              <h2 className="font-semibold text-foreground">
                検索クエリの構文
              </h2>

              <div className="space-y-2">
                <h3 className="font-medium">基本検索</h3>
                <p>キーワードをそのまま入力</p>
                <code className="block rounded bg-muted p-2">
                  pyrrhula かわいい
                </code>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">ユーザーからの投稿を検索</h3>
                <p>from:ユーザーID</p>
                <code className="block rounded bg-muted p-2">
                  from:pyrrhula
                </code>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">期間指定</h3>
                <p>since:日付 until:日付</p>
                <code className="block rounded bg-muted p-2">
                  since:2024-02-01 until:2024-02-29
                </code>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">お気に入り数での絞り込み</h3>
                <p>fav_gt:数字 fav_lt:数字</p>
                <code className="block rounded bg-muted p-2">
                  fav_gt:10 fav_lt:100
                </code>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">リポスト数での絞り込み</h3>
                <p>rep_gt:数字 rep_lt:数字</p>
                <code className="block rounded bg-muted p-2">
                  rep_gt:5 rep_lt:50
                </code>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">返信の検索</h3>
                <p>replyTo:投稿ID</p>
                <code className="block rounded bg-muted p-2">
                  replyTo:abc123
                </code>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">組み合わせ例</h3>
                <code className="block rounded bg-muted p-2">
                  from:pyrrhula since:2024-02-01 fav_gt:10
                </code>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
