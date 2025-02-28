"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navigation } from "@/app/_components/navigation";
import { User, Users } from "lucide-react";
import { useSwipeable } from "react-swipeable";

export default function UserLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"profile" | "list">("profile");

  // パスに基づいてアクティブタブを設定
  useEffect(() => {
    if (pathname === "/user") {
      setActiveTab("list");
    } else if (session?.user?.id && pathname === `/user/${session.user.id}`) {
      setActiveTab("profile");
    }
  }, [pathname, session]);

  // タブの変更を処理
  const handleTabChange = (value: "profile" | "list") => {
    if (value === "profile") {
      if (session?.user?.id) {
        router.push(`/user/${session.user.id}`);
      } else {
        router.push("/login");
        return;
      }
    } else if (value === "list") {
      router.push("/user");
    }
    setActiveTab(value);
  };

  // スワイプハンドラーを設定
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (activeTab === "profile") {
        handleTabChange("list");
      }
    },
    onSwipedRight: () => {
      if (activeTab === "list") {
        handleTabChange("profile");
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
                  activeTab === "profile"
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                onClick={() => handleTabChange("profile")}
              >
                <User className="mr-2 size-4" />
                プロフィール
                {activeTab === "profile" && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-blue-500" />
                )}
              </button>
              <button
                className={`relative flex flex-1 items-center justify-center py-3 font-medium transition-colors ${
                  activeTab === "list"
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                onClick={() => handleTabChange("list")}
              >
                <Users className="mr-2 size-4" />
                ユーザー一覧
                {activeTab === "list" && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-blue-500" />
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
