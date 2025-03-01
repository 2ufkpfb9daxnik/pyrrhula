import type { ReactNode } from "react";
import { Navigation } from "@/app/_components/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      {/* デスクトップ向けの左サイドナビゲーション */}
      <div className="fixed left-0 top-0 hidden h-full md:block">
        <Navigation />
      </div>

      {/* モバイル向けの固定ナビゲーションバー（画面下部） */}
      <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-800 bg-gray-950 md:hidden">
        <Navigation />
      </div>

      <main className="w-full pb-16 md:ml-16 md:pb-0">{children}</main>
    </div>
  );
}
