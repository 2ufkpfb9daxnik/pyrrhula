"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { toast } from "sonner";
import type { RepostListResponse } from "@/app/_types/repost";

type RepostUser = RepostListResponse["users"][0];

export default function RepostListPage({ params }: { params: { id: string } }) {
  const [users, setUsers] = useState<RepostUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchReposts();
  }, [params.id]);

  const fetchReposts = async () => {
    try {
      const url = `/api/posts/${params.id}/repost${
        cursor ? `?cursor=${cursor}` : ""
      }`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch reposts");
      }

      const data: RepostListResponse = await response.json();
      setUsers((prev) => (cursor ? [...prev, ...data.users] : data.users));
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (error) {
      console.error("Error fetching reposts:", error);
      toast.error("拡散したユーザーの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchReposts();
    }
  };

  const handleUserClick = (userId: string) => {
    router.push(`/user/${userId}`);
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
      <h1 className="mb-6 text-xl font-bold">拡散したユーザー</h1>

      {users.length === 0 ? (
        <p className="text-center text-gray-500">
          まだ拡散したユーザーはいません
        </p>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={`${user.id}-${user.createdAt}`}
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
                <div>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-bold hover:underline"
                    onClick={() => handleUserClick(user.id)}
                  >
                    {user.username}
                  </Button>
                  <p className="text-sm text-gray-500">@{user.id}</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(user.createdAt))}
              </span>
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
