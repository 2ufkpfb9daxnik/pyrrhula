"use client";

import { Search } from "@/app/_components/search";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function SearchPage() {
  const handleSearch = async (query: string) => {
    try {
      const response = await fetch(
        `/api/posts/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error("検索に失敗しました");
      }
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error searching posts:", error);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">検索</h1>
      <Search onSearch={handleSearch} />

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
