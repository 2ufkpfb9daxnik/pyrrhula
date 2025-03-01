"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { toast } from "sonner";
import type { UserFollowersResponse } from "@/app/_types/follow";
import { LoaderCircle, UserPlus, UserMinus } from "lucide-react";

type Following = UserFollowersResponse["followers"][0];

// 2のべきペースのページネーションコンポーネント
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
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {powerPages.map((page, index) => {
        // 表示するページ番号の間に大きなギャップがある場合は省略記号を表示
        if (index > 0 && page > powerPages[index - 1] + 1) {
          return (
            <div key={`ellipsis-${page}`} className="flex items-end px-2">
              …
            </div>
          );
        }

        return (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className="min-w-[40px]"
          >
            {page}
          </Button>
        );
      })}
    </div>
  );
};

export default function FollowingPage({ params }: { params: { id: string } }) {
  const [following, setFollowing] = useState<Following[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalFollowing, setTotalFollowing] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [processingFollowIds, setProcessingFollowIds] = useState<Set<string>>(
    new Set()
  );

  // 1ページあたりのフォロー中ユーザー数
  const PAGE_SIZE = 5;

  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchFollowing(currentPage);
  }, [params.id, currentPage]);

  const fetchFollowing = async (page: number) => {
    setIsLoading(true);
    try {
      const url = `/api/users/${params.id}/following?page=${page}&limit=${PAGE_SIZE}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("フォロー中のユーザーの取得に失敗しました");
      }

      const data = await response.json();
      setFollowing(data.followers);

      // totalCountを設定
      if (typeof data.totalCount === "number") {
        setTotalFollowing(data.totalCount);
      } else {
        // APIがtotalCountを返さない場合の推定値
        const estimatedTotal = Math.max(
          data.followers.length + (page - 1) * PAGE_SIZE,
          totalFollowing
        );
        setTotalFollowing(estimatedTotal);
      }
    } catch (error) {
      console.error("Error fetching following:", error);
      toast.error("フォロー中のユーザーの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // ページトップにスクロール
    window.scrollTo(0, 0);
  };

  const totalPages = Math.max(1, Math.ceil(totalFollowing / PAGE_SIZE));

  const handleUserClick = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const handleFollowToggle = async (
    userId: string,
    isCurrentlyFollowing: boolean
  ) => {
    if (!session) {
      toast.error("ログインが必要です");
      return;
    }

    // 既に処理中の場合は何もしない
    if (processingFollowIds.has(userId)) return;

    // 処理中フラグを設定
    setProcessingFollowIds((prev) => new Set(prev).add(userId));

    try {
      const method = isCurrentlyFollowing ? "DELETE" : "POST";
      const actionText = isCurrentlyFollowing ? "フォロー解除" : "フォロー";

      const response = await fetch(`/api/follow/${userId}/`, {
        method: method,
      });

      if (!response.ok) {
        throw new Error(`${actionText}操作に失敗しました`);
      }

      // UI を直接更新してレスポンスを早く見せる
      setFollowing((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, isFollowing: !isCurrentlyFollowing }
            : user
        )
      );

      // 自分のプロフィールページを見ている場合でフォロー解除したら、
      // 現在のページを再読み込みして最新情報を取得
      if (params.id === session.user.id && isCurrentlyFollowing) {
        fetchFollowing(currentPage);
      }

      toast.success(`${actionText}しました`);
    } catch (error) {
      console.error(
        `Error ${isCurrentlyFollowing ? "unfollowing" : "following"} user:`,
        error
      );
      toast.error(
        `${isCurrentlyFollowing ? "フォロー解除" : "フォロー"}操作に失敗しました`
      );
    } finally {
      // 処理中フラグを解除
      setProcessingFollowIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (isLoading && currentPage === 1) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle className="size-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="mb-6 text-xl font-bold">フォロー中</h1>

      {following.length === 0 ? (
        <p className="text-center text-gray-500">
          まだ誰もフォローしていません
        </p>
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

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className={isLoading ? "pointer-events-none opacity-50" : ""}>
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
          )}

          {/* ローディング表示 - 最初のページ以外の場合 */}
          {isLoading && currentPage > 1 && (
            <div className="flex justify-center py-4">
              <LoaderCircle className="size-6 animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
