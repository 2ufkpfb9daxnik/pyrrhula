"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Navigation } from "@/app/_components/navigation";
import { Globe, Users } from "lucide-react";
import { useSwipeable } from "react-swipeable";

export default function TimelineLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<"home" | "whole">("home");

  // パスに基づいてアクティブタブを設定
  useEffect(() => {
    if (pathname === "/whole") {
      setActiveTab("whole");
    } else if (pathname === "/home") {
      setActiveTab("home");
    }
  }, [pathname]);

  // タブの変更を処理
  const handleTabChange = (value: "home" | "whole") => {
    if (value === "home") {
      router.push("/home");
    } else if (value === "whole") {
      router.push("/whole");
    }
    setActiveTab(value);
  };

  // スワイプハンドラーを設定
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (activeTab === "home") {
        handleTabChange("whole");
      }
    },
    onSwipedRight: () => {
      if (activeTab === "whole") {
        handleTabChange("home");
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <div className="flex-1">
        <div className="mx-auto max-w-2xl">
          {/* タブナビゲーション - Twitterライクなスタイル */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
            <div className="flex border-b border-gray-800">
              <button
                className={`relative flex flex-1 items-center justify-center py-3 font-medium transition-colors ${
                  activeTab === "home"
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                onClick={() => handleTabChange("home")}
              >
                <Users className="mr-2 size-4" />
                フォロー中
                {activeTab === "home" && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gray-500" />
                )}
              </button>
              <button
                className={`relative flex flex-1 items-center justify-center py-3 font-medium transition-colors ${
                  activeTab === "whole"
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                onClick={() => handleTabChange("whole")}
              >
                <Globe className="mr-2 size-4" />
                すべての投稿
                {activeTab === "whole" && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* コンテンツエリア - スワイプできるようにする */}
          <div {...swipeHandlers} className="touch-pan-y">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
