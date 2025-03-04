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
            <span key={`ellipsis-${index}`} className="flex items-center px-2">
              ...
            </span>
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

  // APIルートの最適化
  const fetchUsers = async (page: number) => {
    try {
      setIsLoading(true);

      // タイムアウト時間を延長（15秒）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒に延長

      const params = new URLSearchParams({
        sort: sortBy,
        page: page.toString(),
        limit: "5",
        includeFollowStatus: session ? "true" : "false",
      });

      const response = await fetch(`/api/users?${params}`, {
        signal: controller.signal, // signal を追加（これが必要）
        next: { revalidate: 60 },
      });

      // タイムアウトをクリア
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
        total: data.total || 0,
        pages: Math.ceil(data.total / 5),
        currentPage: page,
        hasMore: data.hasMore || false,
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
                  フォローグラフ<br></br>
                  壊れています
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
