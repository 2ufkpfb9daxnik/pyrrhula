"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PowerPagination } from "@/components/ui/power-pagination";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { Star, Calendar, Trophy, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useUsersList } from "@/app/_hooks/useUsersListQuery";
import { queryKeys } from "@/lib/api/query-keys";
import { formatRatingColorClass } from "@/lib/rating";

export default function UsersPage() {
  const [sortBy, setSortBy] = useState<"rate" | "createdAt">("rate");
  const [page, setPage] = useState(1);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useUsersList(sortBy, page, !!session);

  const users = data?.users ?? [];
  const pagination = data?.pagination;

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (processingUsers.has(userId)) return;

    setProcessingUsers((prev) => new Set(prev).add(userId));

    try {
      const response = await fetch(`/api/follow/${userId}`, {
        method: isFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 409 && !isFollowing) {
        toast.success("既にフォロー済みです");
        void refetch();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "フォロー状態の更新に失敗しました");
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.usersList(sortBy, page) });
      toast.success(isFollowing ? "フォロー解除しました" : "フォローしました");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "操作に失敗しました";
      toast.error(errorMessage);
    } finally {
      setProcessingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className="size-12 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold">ユーザー一覧</h1>
        <div className="flex space-x-2">
          <Button
            variant={sortBy === "rate" ? "default" : "outline"}
            onClick={() => {
              setSortBy("rate");
              setPage(1);
            }}
          >
            <Trophy className="mr-2 size-4" />
            レート順
          </Button>
          <Button
            variant={sortBy === "createdAt" ? "default" : "outline"}
            onClick={() => {
              setSortBy("createdAt");
              setPage(1);
            }}
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
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/user/${user.id}`);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-3">
                  <Avatar className="size-12 shrink-0">
                    <AvatarImage src={user.icon ?? undefined} alt={user.username} />
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`truncate text-base font-semibold ${formatRatingColorClass(user.ratingColor)}`}
                      >
                        {user.username}
                      </span>
                      <span className="truncate text-sm text-gray-500">@{user.id}</span>
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
                      {user.isFollower && <span className="text-gray-500">フォロワー</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ml-4 flex shrink-0 flex-col items-end space-y-2">
                {session?.user?.id !== user.id && (
                  <Button
                    variant="outline"
                    className={`w-28 ${
                      user.isFollowing
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-white text-black"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleFollow(user.id, user.isFollowing);
                    }}
                    disabled={!session || processingUsers.has(user.id)}
                  >
                    {processingUsers.has(user.id) ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : user.isFollowing ? (
                      "フォロー解除"
                    ) : (
                      "フォローする"
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-28 border border-gray-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/followgraph/${user.id}`);
                  }}
                >
                  フォローグラフ
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pagination && pagination.pages > 1 && (
        <PowerPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.pages}
          onPageChange={setPage}
        />
      )}
    </>
  );
}
