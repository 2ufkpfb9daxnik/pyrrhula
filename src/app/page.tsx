import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WholeTimeline } from "@/app/_components/wholeTimeline";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* 左側：ランディングページ */}
      <div className="w-1/2 flex flex-col items-center justify-center p-4">
        <div className="flex max-w-xl flex-col items-center space-y-8 text-center">
          {/* ロゴとタイトル */}
          <div className="space-y-4">
            <h1 className="text-6xl font-bold">鷽</h1>
            <p className="text-lg text-muted-foreground">レートのあるSNS</p>
          </div>

          {/* 説明文 */}
          <div className="space-y-2 text-muted-foreground">
            <p className="text-sm">
              ウソ（鷽、学名：Pyrrhula pyrrhula Linnaeus,
              1758）は、スズメ目アトリ科ウソ属に分類される鳥類の一種...
            </p>
            <Link href="https://ja.wikipedia.org/wiki/%E3%82%A6%E3%82%BD" className="text-xs">
              ウソ - Wikipediaより引用
            </Link>
          </div>

          {/* 機能紹介 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 既存の機能紹介カードをそのまま使用 */}
            {/* {...} */}
          </div>

          {/* アクションボタン */}
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
            <Button asChild size="default" className="min-w-[150px]">
              <Link href="/signup">新規登録</Link>
            </Button>
            <Button asChild variant="outline" size="default" className="min-w-[150px]">
              <Link href="/login">ログイン</Link>
            </Button>
          </div>

          {/* フッター */}
          <footer className="mt-6 text-xs text-muted-foreground">
            <p>© 2024 鷽. All rights reserved.</p>
          </footer>
        </div>
      </div>

      {/* 右側：タイムライン */}
      <div className="w-1/2 border-l border-gray-800">
        <WholeTimeline />
      </div>
    </div>
  );
}