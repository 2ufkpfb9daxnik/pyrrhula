import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WholeTimeline } from "@/app/_components/wholeTimeline";
export default function LandingPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* 左側：ランディングページ */}
      <div className="flex w-full flex-col items-center justify-center p-4 md:fixed md:left-0 md:h-screen md:w-1/2">
        <div className="flex max-w-xl flex-col items-center space-y-8 text-center">
          {/* ロゴとタイトル */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold md:text-6xl">鷽</h1>
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
              className="text-sm"
            >
              GitHubリポジトリ
            </Link>
          </div>

          {/* 機能紹介 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* 既存の機能紹介カードをそのまま使用 */}
            {/* 後で書くので一旦放置 */}
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

      {/* 右側：タイムライン - モバイルでは非表示 */}
      <div className="hidden border-l border-gray-800 md:ml-[50%] md:block md:min-h-screen md:w-1/2">
        <WholeTimeline />
      </div>
    </div>
  );
}
