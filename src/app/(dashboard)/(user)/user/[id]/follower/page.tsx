"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { toast } from "sonner";
import type { UserFollowersResponse } from "@/app/_types/follow";
import { LoaderCircle } from "lucide-react";

type Follower = UserFollowersResponse["followers"][0];

export default function FollowersPage({ params }: { params: { id: string } }) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [processingFollowIds, setProcessingFollowIds] = useState<Set<string>>(
    new Set()
  );
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchFollowers();
  }, [params.id]);

  const fetchFollowers = async () => {
    try {
      const url = `/api/users/${params.id}/followers${
        cursor ? `?cursor=${cursor}` : ""
      }`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("フォロワーの取得に失敗しました");
      }

      const data: UserFollowersResponse = await response.json();
      setFollowers((prev) =>
        cursor ? [...prev, ...data.followers] : data.followers
      );
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (error) {
      console.error("Error fetching followers:", error);
      toast.error("フォロワーの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchFollowers();
    }
  };

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

      // 新しいエンドポイントに変更
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

      // 409エラー（Conflict）の場合は特別な処理
      if (response.status === 409) {
        // すでにフォローしている場合は、UIを更新してエラーを無視
        if (!isCurrentlyFollowing) {
          setFollowers((prev) =>
            prev.map((follower) =>
              follower.id === userId
                ? { ...follower, isFollowing: true }
                : follower
            )
          );
          toast.success("既にフォロー済みです");
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `${actionText}に失敗しました`);
      }

      // UIを直接更新（オプティミスティックUI更新）
      setFollowers((prev) =>
        prev.map((follower) =>
          follower.id === userId
            ? { ...follower, isFollowing: !isCurrentlyFollowing }
            : follower
        )
      );

      toast.success(`${actionText}しました`);
    } catch (error) {
      console.error(
        `Error ${isCurrentlyFollowing ? "unfollowing" : "following"} user:`,
        error
      );

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
      setProcessingFollowIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
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
      <h1 className="mb-6 text-xl font-bold">フォロワー</h1>

      {followers.length === 0 ? (
        <p className="text-center text-gray-500">まだフォロワーがいません</p>
      ) : (
        <div className="space-y-4">
          {followers.map((follower) => (
            <div
              key={`${follower.id}-${follower.followedAt}`}
              className="flex items-center justify-between rounded-lg border border-gray-800 p-4 transition-colors hover:bg-gray-900/50"
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
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 text-left font-bold hover:underline"
                    onClick={() => handleUserClick(follower.id)}
                  >
                    {follower.username}
                  </Button>
                  <p className="text-sm text-gray-500">@{follower.id}</p>
                  {follower.profile && (
                    <p className="mt-1 text-sm text-gray-400">
                      {follower.profile}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
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
                      "フォロー解除"
                    ) : (
                      "フォローする"
                    )}
                  </Button>
                )}
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(follower.followedAt))}
                </span>
              </div>
            </div>
          ))}

          {hasMore && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLoadMore}
              disabled={isLoading}
            >
              {isLoading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                "もっと見る"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
