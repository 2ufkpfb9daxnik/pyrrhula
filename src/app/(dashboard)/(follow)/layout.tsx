"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserCheck, Users, ArrowLeft } from "lucide-react";
import { useSwipeable } from "react-swipeable";

export default function FollowLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"following" | "follower">(
    "following"
  );
  const [userId, setUserId] = useState<string | null>(null);

  // パスからユーザーIDを抽出
  useEffect(() => {
    if (pathname) {
      // /user/[id]/following または /user/[id]/follower からIDを抽出
      const match = pathname.match(/\/user\/([^\/]+)\/(following|follower)/);
      if (match && match[1]) {
        setUserId(match[1]);
      }
    }
  }, [pathname]);

  // パスに基づいてアクティブタブを設定
  useEffect(() => {
    if (pathname?.includes("/following")) {
      setActiveTab("following");
    } else if (pathname?.includes("/follower")) {
      setActiveTab("follower");
    }
  }, [pathname]);

  // タブの変更を処理
  const handleTabChange = (value: "following" | "follower") => {
    if (!userId) return; // ユーザーIDがない場合は何もしない

    if (value === "following") {
      router.push(`/user/${userId}/following`);
    } else if (value === "follower") {
      router.push(`/user/${userId}/follower`);
    }
    setActiveTab(value);
  };

  // プロフィールに戻る処理
  const handleBackToProfile = () => {
    if (userId) {
      router.push(`/user/${userId}`);
    }
  };

  // スワイプハンドラーを設定
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (activeTab === "following") {
        handleTabChange("follower");
      }
    },
    onSwipedRight: () => {
      if (activeTab === "follower") {
        handleTabChange("following");
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  // ユーザーIDが取得できるまで待機
  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-12 animate-spin rounded-full border-y-2 border-gray-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl">
        {/* タブナビゲーション - 一番上に配置 */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
          <div className="flex border-b border-gray-800">
            <button
              className={`relative flex flex-1 items-center justify-center py-3 font-medium transition-colors ${
                activeTab === "following"
                  ? "text-primary"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              onClick={() => handleTabChange("following")}
            >
              <UserCheck className="mr-2 size-4" />
              フォロー中
              {activeTab === "following" && (
                <span className="absolute inset-x-0 bottom-0 h-1 bg-gray-500" />
              )}
            </button>
            <button
              className={`relative flex flex-1 items-center justify-center py-3 font-medium transition-colors ${
                activeTab === "follower"
                  ? "text-primary"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              onClick={() => handleTabChange("follower")}
            >
              <Users className="mr-2 size-4" />
              フォロワー
              {activeTab === "follower" && (
                <span className="absolute inset-x-0 bottom-0 h-1 bg-gray-500" />
              )}
            </button>
          </div>

          {/* プロフィールへ戻るボタン */}
          <div className="border-b border-gray-800 px-4 py-2">
            <button
              onClick={handleBackToProfile}
              className="flex items-center text-gray-400 hover:text-white"
            >
              <ArrowLeft className="mr-1 size-4" />
              プロフィールに戻る
            </button>
          </div>
        </div>

        {/* コンテンツエリア - スワイプできるようにする */}
        <div {...swipeHandlers} className="touch-pan-y p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
