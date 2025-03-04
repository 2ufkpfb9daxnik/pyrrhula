"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { Star, Calendar, Trophy, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

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
  const generatePages = () => {
    const pages = new Set<number>();

    // 常に1ページ目と最終ページを表示
    pages.add(1);
    if (totalPages > 1) {
      pages.add(totalPages);
    }

    // 現在のページを追加
    pages.add(currentPage);

    // 前後のページを必ず表示（存在する場合）
    if (currentPage > 1) {
      pages.add(currentPage - 1);
    }
    if (currentPage < totalPages) {
      pages.add(currentPage + 1);
    }

    // 少し離れたページも表示（前後2-3ページ）
    if (currentPage > 3) {
      pages.add(currentPage - 2);
      pages.add(currentPage - 3);
    }
    if (currentPage < totalPages - 2) {
      pages.add(currentPage + 2);
      pages.add(currentPage + 3);
    }

    // 2のべき乗ページを追加
    let power = 4; // 開始を4（2^2）から
    while (currentPage - power >= 1) {
      pages.add(currentPage - power);
      power *= 2;
    }

    power = 4; // 開始を4（2^2）から
    while (currentPage + power <= totalPages) {
      pages.add(currentPage + power);
      power *= 2;
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const pages = generatePages();

  // 省略記号の代わりに表示するための少数のページを選択
  const selectVisiblePages = (allPages: number[]): number[] => {
    // ページ数が20以下なら全て表示
    if (allPages.length <= 20) {
      return allPages;
    }

    // 20ページを超える場合は、必須ページとべき乗ページを選択
    const result: number[] = [];

    // 必須ページ：1, currentPage-1, currentPage, currentPage+1, totalPages
    const mustIncludePages = new Set(
      [1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(
        (p) => p >= 1 && p <= totalPages
      )
    );

    for (const page of allPages) {
      // 必須ページは常に含める
      if (mustIncludePages.has(page)) {
        result.push(page);
        continue;
      }

      // 2のべき乗の差があるページを選ぶ（例：128, 64, 32, 16, 8, 4, 2, 1）
      const distanceToCurrent = Math.abs(page - currentPage);
      const isPowerOfTwo = (num: number): boolean => {
        if (num <= 0) return false;
        return (num & (num - 1)) === 0;
      };

      if (isPowerOfTwo(distanceToCurrent) || isPowerOfTwo(page)) {
        result.push(page);
      }
      // 現在のページの近くのページは優先して表示（追加のページ）
      else if (distanceToCurrent <= 5) {
        result.push(page);
      }
    }

    return [...new Set(result)].sort((a, b) => a - b);
  };

  // 表示するページを選択
  const visiblePages = selectVisiblePages(pages);

  return (
    <div className="flex flex-wrap justify-center gap-2 pt-4">
      {/* 前へボタン */}
      {currentPage > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          className="min-w-[40px]"
        >
          ←
        </Button>
      )}

      {/* ページボタン */}
      {visiblePages.map((page, index) => (
        <>
          {/* 省略記号を表示（大きな隙間がある場合） */}
          {index > 0 && visiblePages[index] - visiblePages[index - 1] > 1 && (
            <span
              key={`ellipsis-${index}`}
              className="flex items-center px-2 text-gray-500"
            >
              ...
            </span>
          )}
          <Button
            key={`page-${page}`}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className={`min-w-[40px] ${
              page === currentPage - 1 || page === currentPage + 1
                ? "border-primary/30"
                : ""
            }`}
          >
            {page}
          </Button>
        </>
      ))}

      {/* 次へボタン */}
      {currentPage < totalPages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          className="min-w-[40px]"
        >
          →
        </Button>
      )}
    </div>
  );
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sortBy, setSortBy] = useState<"rate" | "createdAt">("rate");
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(
    new Set()
  );
  const router = useRouter();
  const { data: session } = useSession();

  // コンポーネントがマウントされたとき、または他のページから戻ってきたときに再取得
  useEffect(() => {
    fetchUsers(pagination?.currentPage || 1);
  }, [session]);

  // ソート順が変更されたときは1ページ目から表示
  useEffect(() => {
    fetchUsers(1);
  }, [sortBy]);

  // 指数バックオフでリトライする関数
  const fetchUsersWithRetry = async (
    page: number,
    retryCount = 0
  ): Promise<any> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒に延長

      const params = new URLSearchParams({
        sort: sortBy,
        page: page.toString(),
        limit: "5",
        includeFollowStatus: session ? "true" : "false",
      });

      const response = await fetch(`/api/users?${params}`, {
        signal: controller.signal,
        cache: "no-store", // キャッシュ無効化（デバッグ時のみ）
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 500エラーでリトライ回数が最大値未満の場合
        if (response.status === 500 && retryCount < 3) {
          // 指数バックオフ待機（0.5秒、1秒、2秒...）
          const waitTime = Math.pow(2, retryCount) * 500;
          console.log(
            `API接続エラー、${waitTime}ms後にリトライします (${retryCount + 1}/4)`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return fetchUsersWithRetry(page, retryCount + 1);
        }

        throw new Error(
          response.status === 504
            ? "サーバーの応答がタイムアウトしました。後でもう一度お試しください。"
            : "ユーザー情報の取得に失敗しました"
        );
      }

      return await response.json();
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError" &&
        retryCount < 3
      ) {
        // タイムアウトの場合も指数バックオフでリトライ
        const waitTime = Math.pow(2, retryCount) * 500;
        console.log(
          `タイムアウト、${waitTime}ms後にリトライします (${retryCount + 1}/4)`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return fetchUsersWithRetry(page, retryCount + 1);
      }
      throw error;
    }
  };

  // APIルートの最適化
  const fetchUsers = async (page: number) => {
    try {
      setIsLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        throw new Error(
          response.status === 504
            ? "サーバーの応答がタイムアウトしました。後でもう一度お試しください。"
            : "ユーザー情報の取得に失敗しました"
        );
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
        ratingColor: user.ratingColor || "",
      }));

      setUsers(formattedUsers);

      setPagination({
        total: data.pagination?.total || 0,
        pages:
          data.pagination?.pages ||
          Math.ceil((data.pagination?.total || 0) / 5),
        currentPage: page,
        hasMore: data.pagination?.hasMore || false,
      });
    } catch (error) {
      console.error("Error fetching users:", error);

      // AbortError の場合は特別なメッセージ
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          toast.error(
            "リクエストがタイムアウトしました。ネットワーク接続を確認してください。"
          );
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("一時的なエラーが発生しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!session) {
      router.push("/login");
      return;
    }

    // 既に処理中の場合は何もしない
    if (processingUsers.has(userId)) return;

    // 処理中フラグを設定
    setProcessingUsers((prev) => new Set(prev).add(userId));

    try {
      // APIリクエスト
      const response = await fetch(`/api/follow/${userId}`, {
        method: isFollowing ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // HTMLレスポンスが返ってくる場合のエラーハンドリング（404などの場合）
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error(
          "APIエンドポイントが見つかりません。URLを確認してください。"
        );
      }

      // 409エラー（Conflict）の場合は特別な処理
      if (response.status === 409) {
        // すでにフォローしている場合は、UIを更新してエラーを無視
        if (!isFollowing) {
          setUsers((prev) =>
            prev.map((user) =>
              user.id === userId ? { ...user, isFollowing: true } : user
            )
          );
          toast.success("既にフォロー済みです");
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "フォロー状態の更新に失敗しました");
      }

      // UIを更新
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

      // より具体的なエラーメッセージを表示
      const errorMessage =
        error instanceof Error ? error.message : "操作に失敗しました";

      // 特定のエラーメッセージをユーザーフレンドリーな表現に変換
      let displayMessage = errorMessage;
      if (errorMessage === "Already following this user") {
        displayMessage = "既にフォロー済みです";
      } else if (errorMessage === "Not following this user") {
        displayMessage = "フォローしていません";
      }

      toast.error(displayMessage);
    } finally {
      // 処理中フラグを解除
      setProcessingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (isLoading) {
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
              {/* ユーザー情報部分 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-3">
                  <Avatar className="size-12 shrink-0">
                    <AvatarImage
                      src={user.icon ?? undefined}
                      alt={user.username}
                    />
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-base font-semibold ${user.ratingColor} truncate`}
                      >
                        {user.username}
                      </span>
                      <span className="truncate text-sm text-gray-500">
                        @{user.id}
                      </span>
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
              </div>

              {/* ボタン部分 */}
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
                      handleFollow(user.id, user.isFollowing || false);
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

      {/* ページネーション */}
      {pagination && pagination.pages > 1 && (
        <PowerPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.pages}
          onPageChange={fetchUsers}
        />
      )}
    </>
  );
}
