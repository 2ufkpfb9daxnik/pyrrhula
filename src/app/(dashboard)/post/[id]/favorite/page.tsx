"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { toast } from "sonner";
import type { FavoriteListResponse } from "@/app/_types/favorite";
import { LoaderCircle } from "lucide-react";
import { useInView } from "react-intersection-observer";

export default function FavoriteListPage() {
  const [users, setUsers] = useState<FavoriteListResponse["users"]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const hasEnteredLoadMoreRef = useRef(false);
  const params = useParams<{ id: string }>();
  const postId = params?.id ?? "";
  const router = useRouter();
  const { data: session } = useSession();
  const { ref: loadMoreRef, inView: isLoadMoreInView } = useInView({
    rootMargin: "0px 0px",
  });

  useEffect(() => {
    if (!postId) return;
    void fetchFavorites();
  }, [postId]);

  useEffect(() => {
    const entered = isLoadMoreInView && !hasEnteredLoadMoreRef.current;
    if (entered && hasMore && cursor && !isLoading && !isFetchingMore) {
      void fetchFavorites(cursor);
    }
    hasEnteredLoadMoreRef.current = isLoadMoreInView;
  }, [isLoadMoreInView, hasMore, cursor, isLoading, isFetchingMore]);

  const fetchFavorites = async (cursorParam?: string) => {
    try {
      if (cursorParam) {
        setIsFetchingMore(true);
      } else {
        setIsLoading(true);
      }

      const url = `/api/posts/${postId}/favorite${
        cursorParam ? `?cursor=${cursorParam}&limit=10` : "?limit=10"
      }`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("お気に入りの取得に失敗しました");
      }

      const data: FavoriteListResponse = await response.json();
      setUsers((prev) => (cursorParam ? [...prev, ...data.users] : data.users));
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast.error("お気に入りの取得に失敗しました");
    } finally {
      if (cursorParam) {
        setIsFetchingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleUserClick = (userId: string) => {
    router.push(`/user/${userId}`);
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
      <h1 className="mb-6 text-xl font-bold">お気に入りしたユーザー</h1>

      {users.length === 0 ? (
        <p className="text-center text-gray-500">
          まだお気に入りしたユーザーはいません
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
            <div ref={loadMoreRef} className="flex justify-center py-2">
              {isFetchingMore ? (
                <LoaderCircle className="size-5 animate-spin text-gray-500" />
              ) : (
                <span className="text-sm text-gray-500">
                  下へスクロールして読み込み
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
