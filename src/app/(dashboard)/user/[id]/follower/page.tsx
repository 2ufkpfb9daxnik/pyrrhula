"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { toast } from "sonner";
import type { UserFollowersResponse } from "@/app/_types/follow";

type Follower = UserFollowersResponse["followers"][0];

export default function FollowersPage({ params }: { params: { id: string } }) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
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

  const handleFollow = async (userId: string) => {
    if (!session) {
      toast.error("ログインが必要です");
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("フォロー操作に失敗しました");
      }

      // フォロワー一覧を更新
      fetchFollowers();
      toast.success("フォロー状態を更新しました");
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("フォロー操作に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
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
                    onClick={() => handleFollow(follower.id)}
                    size="sm"
                  >
                    {follower.isFollowing ? "フォロー中" : "フォローする"}
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
              {isLoading ? "読み込み中..." : "もっと見る"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
