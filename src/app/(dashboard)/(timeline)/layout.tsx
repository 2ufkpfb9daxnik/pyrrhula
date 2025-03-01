"use client";

import { useState, useEffect, ReactNode, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navigation } from "@/app/_components/navigation";
import { MakePost } from "@/app/_components/makepost";
import { Search } from "@/app/_components/search";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Globe } from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { toast } from "sonner";

// ユーザー情報の型定義
interface UserInfo {
  icon: string | null;
  username: string;
  id: string;
}

export default function TimelineLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"following" | "global">(
    "following"
  );

  // 左サイドバー用の状態
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [parentPost, setParentPost] = useState<any | null>(null);
  const postInputRef = useRef<HTMLTextAreaElement>(null);

  // パスに基づいてアクティブタブを設定
  useEffect(() => {
    if (pathname === "/" || pathname === "/home") {
      setActiveTab("following");
    } else if (pathname === "/whole") {
      setActiveTab("global");
    }
  }, [pathname]);

  // ユーザー情報を取得
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserInfo();
    }
  }, [session]);

  // ユーザー情報を取得する関数
  const fetchUserInfo = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        next: { revalidate: 300 }, // 5分間キャッシュ
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user info");
      }

      const data = await response.json();
      setUserInfo(data);
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  // タブの変更を処理
  const handleTabChange = (value: "following" | "global") => {
    if (value === "following") {
      router.push("/home");
    } else if (value === "global") {
      router.push("/whole");
    }
    setActiveTab(value);
  };

  // ユーザープロフィールをクリックした時の処理
  const handleUserClick = () => {
    if (session?.user?.id) {
      router.push(`/user/${session.user.id}`);
    }
  };

  // キーボードショートカット
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === "n" &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        e.preventDefault();
        postInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // 投稿作成成功時のハンドラ（子コンポーネントに渡す用）
  const handlePostCreated = (newPost: any) => {
    // 実際の処理は子コンポーネント側で行われる
    toast.success("投稿が作成されました");
  };

  // 検索ハンドラ（必要に応じて実装）
  const handleSearch = (query: string) => {
    // 検索クエリに応じてルーティングするなどの処理
    toast.info(`「${query}」で検索中...`);
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

      {/* デスクトップ向けの左サイドバー - layout.tsxに移植 */}
      {session && (
        <div className="fixed hidden h-full w-80 flex-col gap-4 border-r border-gray-800 p-4 md:left-16 md:top-0 md:flex">
          <button
            onClick={handleUserClick}
            className="flex w-full items-start space-x-3 border-b border-gray-800 pb-4 text-left transition-colors hover:bg-gray-800/50"
          >
            <div className="flex items-start space-x-3 border-gray-800">
              <Avatar className="size-12">
                <AvatarImage src={userInfo?.icon ?? undefined} />
                <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold">{session?.user?.name}</span>
                <span className="text-sm text-muted-foreground">
                  @{session?.user?.id}
                </span>
              </div>
            </div>
          </button>

          <MakePost
            onPostCreated={handlePostCreated}
            replyTo={
              parentPost
                ? {
                    id: parentPost.id,
                    content: parentPost.content,
                    username: parentPost.user.username,
                  }
                : undefined
            }
            inputRef={postInputRef}
          />

          <Search onSearch={handleSearch} />
        </div>
      )}

      <div className="flex-1">
        <div className="mx-auto max-w-2xl md:ml-96">
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
          <div {...swipeHandlers} className="touch-pan-y">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
