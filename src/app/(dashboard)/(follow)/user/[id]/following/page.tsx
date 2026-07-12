"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PowerPagination } from "@/components/ui/power-pagination";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { toast } from "sonner";
import type { UserFollowersResponse } from "@/app/_types/follow";
import { LoaderCircle, UserPlus, UserMinus } from "lucide-react";
import { fetchJson } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { STALE_TIME_MS } from "@/lib/query-client";

type Following = UserFollowersResponse["followers"][0];

const PAGE_SIZE = 5;

export default function FollowingPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [processingFollowIds, setProcessingFollowIds] = useState<Set<string>>(
    new Set(),
  );

  const params = useParams<{ id: string }>();
  const routeUserId = params?.id ?? "";
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.userFollowing(routeUserId, currentPage),
    queryFn: () =>
      fetchJson<UserFollowersResponse & { totalCount?: number }>(
        `/api/users/${routeUserId}/following?page=${currentPage}&limit=${PAGE_SIZE}`,
      ),
    enabled: !!routeUserId,
    staleTime: STALE_TIME_MS,
    refetchOnMount: true,
    placeholderData: keepPreviousData,
  });

  const following = data?.followers ?? [];
  const totalFollowing =
    typeof data?.totalCount === "number"
      ? data.totalCount
      : Math.max(following.length + (currentPage - 1) * PAGE_SIZE, 0);
  const totalPages = Math.max(1, Math.ceil(totalFollowing / PAGE_SIZE));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleUserClick = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const handleFollowToggle = async (
    userId: string,
    isCurrentlyFollowing: boolean,
  ) => {
    if (!session) {
      toast.error("ログインが必要です");
      return;
    }
    if (processingFollowIds.has(userId)) return;

    setProcessingFollowIds((prev) => new Set(prev).add(userId));

    try {
      const method = isCurrentlyFollowing ? "DELETE" : "POST";
      const actionText = isCurrentlyFollowing ? "フォロー解除" : "フォロー";
      const response = await fetch(`/api/follow/${userId}/`, {
        method,
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `${actionText}に失敗しました`);
      }

      if (isCurrentlyFollowing && session.user?.id === routeUserId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.userFollowing(routeUserId, currentPage),
        });
      } else {
        queryClient.setQueryData(
          queryKeys.userFollowing(routeUserId, currentPage),
          (
            old: (UserFollowersResponse & { totalCount?: number }) | undefined,
          ) => {
            if (!old) return old;
            return {
              ...old,
              followers: old.followers.map((user) =>
                user.id === userId
                  ? { ...user, isFollowing: !isCurrentlyFollowing }
                  : user,
              ),
            };
          },
        );
      }

      toast.success(`${actionText}しました`);
    } catch {
      toast.error("操作に失敗しました");
    } finally {
      setProcessingFollowIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (isLoading && following.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle className="size-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isFetching ? "opacity-90" : ""}`}>
      {following.length === 0 ? (
        <p className="text-center text-gray-500">まだ誰もフォローしていません</p>
      ) : (
        <>
          <div className="space-y-4">
            {following.map((user) => (
              <div
                key={`${user.id}-${user.followedAt}`}
                className="flex flex-wrap items-center justify-between rounded-lg border border-gray-800 p-4 transition-colors hover:bg-gray-900/50"
              >
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    className="p-0"
                    onClick={() => handleUserClick(user.id)}
                  >
                    <Avatar className="size-12">
                      <AvatarImage src={user.icon ?? undefined} />
                      <AvatarFallback>{user.username[0]}</AvatarFallback>
                    </Avatar>
                  </Button>
                  <div className="flex max-w-[calc(100%-3rem)] flex-col">
                    <Button
                      variant="ghost"
                      className="h-auto w-full truncate p-0 text-left font-bold hover:underline"
                      onClick={() => handleUserClick(user.id)}
                      title={user.username}
                    >
                      <span className="truncate">{user.username}</span>
                    </Button>
                    <p
                      className="truncate text-sm text-gray-500"
                      title={`@${user.id}`}
                    >
                      @{user.id}
                    </p>
                    {user.profile && (
                      <p
                        className="mt-1 line-clamp-2 text-sm text-gray-400"
                        title={user.profile}
                      >
                        {user.profile}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center space-x-4 sm:mt-0">
                  {session?.user?.id !== user.id && (
                    <Button
                      variant={user.isFollowing ? "secondary" : "default"}
                      onClick={() =>
                        handleFollowToggle(user.id, user.isFollowing || false)
                      }
                      size="sm"
                      disabled={processingFollowIds.has(user.id)}
                    >
                      {processingFollowIds.has(user.id) ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : user.isFollowing ? (
                        <>
                          <UserMinus className="mr-2 size-4" />
                          フォロー解除
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 size-4" />
                          フォローする
                        </>
                      )}
                    </Button>
                  )}
                  <span className="whitespace-nowrap text-sm text-gray-500">
                    {formatDistanceToNow(new Date(user.followedAt))}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 text-center text-sm text-gray-500">
              {totalFollowing}人中 {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
              {Math.min(currentPage * PAGE_SIZE, totalFollowing)}人表示
            </div>
            <PowerPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
