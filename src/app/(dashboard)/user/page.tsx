"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { Star, Calendar, Trophy, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Share2 } from "lucide-react";

type RatingColor = string;

interface User {
  id: string;
  username: string;
  icon: string | null;
  rate: number;
  postCount: number;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  isFollowing?: boolean;
  isFollower?: boolean;
  ratingColor: RatingColor;
}

interface PaginationInfo {
  total: number;
  pages: number;
  currentPage: number;
  hasMore: boolean;
}

const PowerPagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  const generatePowerPages = () => {
    const pages = new Set<number>();

    // 常に1ページ目を表示
    pages.add(1);

    // 現在のページを追加
    pages.add(currentPage);

    // 前のページ（2のべき乗分）
    let power = 1;
    while (currentPage - power >= 1) {
      pages.add(currentPage - power);
      power *= 2;
    }

    // 次のページ（2のべき乗分）
    power = 1;
    while (currentPage + power <= totalPages) {
      pages.add(currentPage + power);
      power *= 2;
    }

    // 最後のページを追加（総ページ数が2以上の場合）
    if (totalPages > 1) {
      pages.add(totalPages);
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const powerPages = generatePowerPages();

  return (
    <div className="flex flex-wrap justify-center gap-2 pt-4">
      {powerPages.map((page, index) => (
        <>
          {index > 0 && powerPages[index] - powerPages[index - 1] > 1 && (
            <span className="flex items-center px-2">...</span>
          )}
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className="min-w-[40px]"
          >
            {page}
          </Button>
        </>
      ))}
    </div>
  );
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sortBy, setSortBy] = useState<"rate" | "createdAt">("rate");
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  // コンポーネントがマウントされたとき、または他のページから戻ってきたときに再取得
  useEffect(() => {
    if (session) {
      fetchUsers(pagination?.currentPage || 1);
    }
  }, [session]);

  // ソート順が変更されたときは1ページ目から表示
  useEffect(() => {
    fetchUsers(1);
  }, [sortBy]);
  // APIルートの最適化
  const fetchUsers = async (page: number) => {
    try {
      setIsLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const params = new URLSearchParams({
        sort: sortBy,
        page: page.toString(),
        limit: "5",
        includeFollowStatus: session ? "true" : "false",
      });

      const response = await fetch(`/api/users?${params}`, {
        signal: controller.signal,
        next: { revalidate: 60 },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error(
            "サーバーの応答がタイムアウトしました。後でもう一度お試しください。"
          );
        }
        throw new Error("ユーザー情報の取得に失敗しました");
      }

      const data = await response.json();

      // データの整形を確実に行う
      const formattedUsers = data.users.map((user: any) => ({
        id: user.id,
        username: user.username,
        icon: user.icon,
        rate: user.rate,
        postCount: user.postCount,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        createdAt: user.createdAt,
        isFollowing: user.isFollowing || false,
        isFollower: user.isFollower || false,
        ratingColor: user.ratingColor,
      }));

      setUsers(formattedUsers);

      setPagination({
        total: data.total || 0,
        pages: Math.ceil(data.total / 5),
        currentPage: page,
        hasMore: data.hasMore,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(
        error instanceof Error ? error.message : "一時的なエラーが発生しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!session) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(`/api/follow/${userId}`, {
        method: isFollowing ? "DELETE" : "POST",
      });

      if (!response.ok) throw new Error("Failed to update follow status");

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, isFollowing: !user.isFollowing }
            : user
        )
      );

      toast.success(isFollowing ? "フォロー解除しました" : "フォローしました");
    } catch (error) {
      console.error("Follow error:", error);
      toast.error("操作に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="size-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-6 flex items-center justify-between border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold">ユーザー一覧</h1>
        <div className="flex space-x-2">
          <Button
            variant={sortBy === "rate" ? "default" : "outline"}
            onClick={() => setSortBy("rate")}
            className="flex items-center"
          >
            <Trophy className="mr-2 size-4" />
            レート順
          </Button>
          <Button
            variant={sortBy === "createdAt" ? "default" : "outline"}
            onClick={() => setSortBy("createdAt")}
            className="flex items-center"
          >
            <Calendar className="mr-2 size-4" />
            登録順
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="cursor-pointer border-b border-gray-800 px-4 py-3 hover:bg-gray-900/50"
            onClick={() => router.push(`/user/${user.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="size-12">
                  <AvatarImage
                    src={user.icon ?? undefined}
                    alt={user.username}
                  />
                  <AvatarFallback>{user.username[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-base font-semibold ${user.ratingColor}`}
                    >
                      {user.username}
                    </span>
                    <span className="text-sm text-gray-500">@{user.id}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-400">
                    <span className="flex items-center">
                      <Star className="mr-1 size-4" />
                      {user.rate}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="mr-1 size-4" />
                      {formatDistanceToNow(new Date(user.createdAt))}
                    </span>
                    {user.isFollower && (
                      <span className="text-gray-500">フォロワー</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {session?.user?.id !== user.id && (
                  <Button
                    variant="outline"
                    className={
                      user.isFollowing
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-white text-black"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(user.id, user.isFollowing || false);
                    }}
                    disabled={!session}
                  >
                    {user.isFollowing ? "フォロー解除" : "フォローする"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="border border-gray-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/followgraph/${user.id}`);
                  }}
                >
                  フォローグラフ壊れています
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* ページネーション */}
        {pagination && (
          <PowerPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.pages}
            onPageChange={fetchUsers}
          />
        )}
      </div>
    </div>
  );
}
