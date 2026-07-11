"use client";

import { useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Users } from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { queryKeys } from "@/lib/api/query-keys";
import { fetchJson } from "@/lib/api/client";

export default function UserLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const activeTab =
    pathname === "/user"
      ? "list"
      : session?.user?.id && pathname === `/user/${session.user.id}`
        ? "profile"
        : "profile";

  useEffect(() => {
    if (!session?.user?.id) return;
    void queryClient.prefetchQuery({
      queryKey: queryKeys.user(session.user.id),
      queryFn: () => fetchJson(`/api/users/${session.user.id}`),
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.usersList("rate", 1),
      queryFn: () =>
        fetchJson(
          "/api/users?sort=rate&page=1&limit=5&includeFollowStatus=true",
        ),
    });
  }, [session?.user?.id, queryClient]);

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
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        <div className="mx-auto max-w-2xl">
          {/* タブナビゲーション - 常に表示されるように sticky に */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md">
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
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gray-500" />
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
