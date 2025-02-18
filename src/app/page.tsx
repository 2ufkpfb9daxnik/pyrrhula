import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex max-w-2xl flex-col items-center space-y-8 text-center">
        {/* ロゴとタイトル */}
        <div className="space-y-4">
          <h1 className="text-8xl font-bold">鷽</h1>
          <p className="text-xl text-muted-foreground">レートのあるSNS</p>
        </div>

        {/* 説明文 */}
        <div className="space-y-2 text-muted-foreground">
          <p>
            ウソ（鷽、学名：Pyrrhula pyrrhula Linnaeus,
            1758）は、スズメ目アトリ科ウソ属に分類される鳥類の一種。和名の由来は口笛を意味する古語「うそ」から来ており、ヒーホーと口笛のような鳴き...
          </p>
          <Link href="https://ja.wikipedia.org/wiki/%E3%82%A6%E3%82%BD">
            ウソ - Wikipediaより引用{" "}
          </Link>
        </div>

        {/* 機能紹介 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-800 p-4">
            <h3 className="mb-2 font-semibold">🐦 シンプルな投稿</h3>
            <p className="text-sm text-muted-foreground">
              思ったことを、すぐに共有できます
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 p-4">
            <h3 className="mb-2 font-semibold">🔄 つながりを育む</h3>
            <p className="text-sm text-muted-foreground">
              リポストやお気に入りで交流を深めましょう
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 p-4">
            <h3 className="mb-2 font-semibold">💬 会話を楽しむ</h3>
            <p className="text-sm text-muted-foreground">
              リプライやダイレクトメッセージで会話を
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 p-4">
            <h3 className="mb-2 font-semibold">🎯 レート制度</h3>
            <p className="text-sm text-muted-foreground">
              活発な交流で評価が上がります
            </p>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          <Button asChild size="lg" className="min-w-[200px]">
            <Link href="/signup">新規登録</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-w-[200px]">
            <Link href="/login">ログイン</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="min-w-[200px]">
            <Link href="/whole">ログインせず見てみる</Link>
          </Button>
        </div>

        {/* フッター */}
        <footer className="mt-8 text-sm text-muted-foreground">
          <p>© 2024 鷽. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
