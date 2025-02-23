"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { toast } from "sonner";
import type { UserFollowersResponse } from "@/app/_types/follow";
import { Loader, LoaderCircle } from "lucide-react";

type Following = UserFollowersResponse["followers"][0];

export default function FollowingPage({ params }: { params: { id: string } }) {
  const [following, setFollowing] = useState<Following[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchFollowing();
  }, [params.id]);

  const fetchFollowing = async () => {
    try {
      const url = `/api/users/${params.id}/following${
        cursor ? `?cursor=${cursor}` : ""
      }`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("フォロー中のユーザーの取得に失敗しました");
      }

      const data: UserFollowersResponse = await response.json();
      setFollowing((prev) =>
        cursor ? [...prev, ...data.followers] : data.followers
      );
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (error) {
      console.error("Error fetching following:", error);
      toast.error("フォロー中のユーザーの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchFollowing();
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

      // フォロー一覧を更新
      fetchFollowing();
      toast.success("フォロー状態を更新しました");
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("フォロー操作に失敗しました");
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
      <h1 className="mb-6 text-xl font-bold">フォロー中</h1>

      {following.length === 0 ? (
        <p className="text-center text-gray-500">
          まだ誰もフォローしていません
        </p>
      ) : (
        <div className="space-y-4">
          {following.map((user) => (
            <div
              key={`${user.id}-${user.followedAt}`}
              className="flex items-center justify-between rounded-lg border border-gray-800 p-4 transition-colors hover:bg-gray-900/50"
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
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 text-left font-bold hover:underline"
                    onClick={() => handleUserClick(user.id)}
                  >
                    {user.username}
                  </Button>
                  <p className="text-sm text-gray-500">@{user.id}</p>
                  {user.profile && (
                    <p className="mt-1 text-sm text-gray-400">{user.profile}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {session?.user?.id !== user.id && (
                  <Button
                    variant={user.isFollowing ? "secondary" : "default"}
                    onClick={() => handleFollow(user.id)}
                    size="sm"
                  >
                    {user.isFollowing ? "フォロー中" : "フォローする"}
                  </Button>
                )}
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(user.followedAt))}
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
                <LoaderCircle className="animate-spin"></LoaderCircle>
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
