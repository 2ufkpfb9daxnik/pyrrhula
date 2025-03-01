"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navigation } from "@/app/_components/navigation";
import { Users, Globe } from "lucide-react";
import { useSwipeable } from "react-swipeable";

export default function TimelineLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"following" | "global">(
    "following"
  );

  // パスに基づいてアクティブタブを設定
  useEffect(() => {
    if (pathname === "/" || pathname === "/home") {
      setActiveTab("following");
    } else if (pathname === "/whole") {
      setActiveTab("global");
    }
  }, [pathname]);

  // タブの変更を処理
  const handleTabChange = (value: "following" | "global") => {
    if (value === "following") {
      router.push("/home");
    } else if (value === "global") {
      router.push("/whole");
    }
    setActiveTab(value);
  };

  // スワイプハンドラーを設定
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (activeTab === "following") {
        handleTabChange("global");
      }
    },
    onSwipedRight: () => {
      if (activeTab === "global") {
        handleTabChange("following");
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0 md:pl-16">
      {/* モバイル向けの固定ナビゲーションバー（画面下部） */}
      <div className="md:hidden">
        <Navigation />
      </div>

      {/* デスクトップ向けの左サイドナビゲーション */}
      <div className="hidden md:block">
        <Navigation />
      </div>

      <div className="flex-1">
        <div className="mx-auto max-w-2xl">
          {/* タブナビゲーション - 常に表示されるように sticky に */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md">
            <div className="flex border-b border-gray-800">
              <button
                className={`relative flex flex-1 items-center justify-center py-3 font-medium transition-colors ${
                  activeTab === "following"
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                onClick={() => handleTabChange("following")}
              >
                <Users className="mr-2 size-4" />
                フォロー中
                {activeTab === "following" && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gray-500" />
                )}
              </button>
              <button
                className={`relative flex flex-1 items-center justify-center py-3 font-medium transition-colors ${
                  activeTab === "global"
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                onClick={() => handleTabChange("global")}
              >
                <Globe className="mr-2 size-4" />
                全体
                {activeTab === "global" && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* コンテンツエリア - スワイプできるようにする */}
          <div {...swipeHandlers} className="touch-pan-y p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
