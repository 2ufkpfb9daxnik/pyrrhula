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

type Follower = UserFollowersResponse["followers"][0];

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

export default function FollowersPage({ params }: { params: { id: string } }) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [processingFollowIds, setProcessingFollowIds] = useState<Set<string>>(
    new Set()
  );

  // 1ページあたりのフォロワー数
  const PAGE_SIZE = 5;

  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchFollowers(currentPage);
  }, [params.id, currentPage]);

  const fetchFollowers = async (page: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/users/${params.id}/followers?page=${page}&limit=${PAGE_SIZE}`
      );

      if (!response.ok) {
        throw new Error("フォロワーの取得に失敗しました");
      }

      const data = await response.json();
      setFollowers(data.followers);

      // totalCount が存在すればそれを使用、存在しなければ配列の長さや他の方法で計算
      if (typeof data.totalCount === "number") {
        setTotalFollowers(data.totalCount);
      } else {
        // API が totalCount を返さない場合、最低でも現在のページ * ページサイズを使用
        // 最後のページの場合は正確にならないが、少なくとも最低限のページネーションは表示される
        const estimatedTotal = Math.max(
          data.followers.length + (page - 1) * PAGE_SIZE,
          totalFollowers
        );
        setTotalFollowers(estimatedTotal);
        console.warn(
          "API did not return totalCount, using estimated value:",
          estimatedTotal
        );
      }

      // デバッグ情報
      console.log("API Response:", {
        followers: data.followers.length,
        totalCount: data.totalCount,
        calculatedTotal: totalFollowers,
        willShowPagination: Math.ceil(data.totalCount / PAGE_SIZE) > 1,
      });
    } catch (error) {
      console.error("Error fetching followers:", error);
      toast.error("フォロワーの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // ページトップにスクロール
    window.scrollTo(0, 0);
  };

  // totalPages の計算は useEffect の外で行う
  const totalPages = Math.max(1, Math.ceil(totalFollowers / PAGE_SIZE));

  // デバッグ用
  useEffect(() => {
    console.log("Pagination state:", {
      totalFollowers,
      PAGE_SIZE,
      totalPages,
      shouldShowPagination: totalPages > 1,
    });
  }, [totalFollowers, totalPages]);

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
      // フォロー状態に応じてメソッドを選択
      const method = isCurrentlyFollowing ? "DELETE" : "POST";
      const actionText = isCurrentlyFollowing ? "フォロー解除" : "フォロー";

      const response = await fetch(`/api/follow/${userId}`, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      // HTMLレスポンスが返ってくる場合のエラーハンドリング
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error(
          "APIエンドポイントが見つかりません。URLを確認してください。"
        );
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `${actionText}に失敗しました`);
      }

      // UIを直接更新
      setFollowers((prev) =>
        prev.map((follower) =>
          follower.id === userId
            ? { ...follower, isFollowing: !isCurrentlyFollowing }
            : follower
        )
      );

      toast.success(`${actionText}しました`);
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("操作に失敗しました");
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
      {followers.length === 0 ? (
        <p className="text-center text-gray-500">まだフォロワーがいません</p>
      ) : (
        <>
          <div className="space-y-4">
            {followers.map((follower) => (
              <div
                key={`${follower.id}-${follower.followedAt}`}
                className="flex flex-wrap items-center justify-between rounded-lg border border-gray-800 p-4 transition-colors hover:bg-gray-900/50"
              >
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    className="p-0"
                    onClick={() => handleUserClick(follower.id)}
                  >
                    <Avatar className="size-12">
                      <AvatarImage src={follower.icon ?? undefined} />
                      <AvatarFallback>{follower.username[0]}</AvatarFallback>
                    </Avatar>
                  </Button>
                  <div className="flex max-w-[calc(100%-3rem)] flex-col">
                    <Button
                      variant="ghost"
                      className="h-auto w-full truncate p-0 text-left font-bold hover:underline"
                      onClick={() => handleUserClick(follower.id)}
                      title={follower.username}
                    >
                      <span className="truncate">{follower.username}</span>
                    </Button>
                    <p
                      className="truncate text-sm text-gray-500"
                      title={`@${follower.id}`}
                    >
                      @{follower.id}
                    </p>
                    {follower.profile && (
                      <p
                        className="mt-1 line-clamp-2 text-sm text-gray-400"
                        title={follower.profile}
                      >
                        {follower.profile}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center space-x-4 sm:mt-0">
                  {session?.user?.id !== follower.id && (
                    <Button
                      variant={follower.isFollowing ? "secondary" : "default"}
                      onClick={() =>
                        handleFollowToggle(
                          follower.id,
                          follower.isFollowing || false
                        )
                      }
                      size="sm"
                      disabled={processingFollowIds.has(follower.id)}
                    >
                      {processingFollowIds.has(follower.id) ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : follower.isFollowing ? (
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
                    {formatDistanceToNow(new Date(follower.followedAt))}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ページネーションを条件に関わらず常に表示（デバッグ用） */}
          <div className={isLoading ? "pointer-events-none opacity-50" : ""}>
            <div className="mb-2 text-center text-sm text-gray-500">
              {totalFollowers}人中 {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
              {Math.min(currentPage * PAGE_SIZE, totalFollowers)}人表示
            </div>
            <PowerPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>

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
