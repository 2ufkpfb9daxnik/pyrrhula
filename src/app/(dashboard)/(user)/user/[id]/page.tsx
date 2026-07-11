"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageSquare,
  Star,
  RefreshCw,
  Calendar,
  Users,
  MessageCircle,
  BarChart,
  UserPlus,
  UserMinus,
  Send,
} from "lucide-react";
import { Post as PostComponent } from "@/app/_components/post";
import { RatingChartSection } from "@/app/_components/RatingChartSection";
import { StaleRefreshBanner } from "@/app/_components/StaleRefreshBanner";
import { toast } from "sonner";
import { format } from "date-fns";
import { LoaderCircle } from "lucide-react";
import { linkify } from "@/lib/linkify";
import { useInView } from "react-intersection-observer";
import {
  useUserProfile,
  useUserRatingHistory,
} from "@/app/_hooks/useUserQueries";
import { fetchJson } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { formatApiPost } from "@/lib/format-post";
import type { ApiPostRaw } from "@/lib/api/timeline";
import type { Post } from "@/app/_types/post";

type ContentTab = "posts" | "reposts" | "favorites" | "replies";

interface ContentPage {
  posts: Post[];
  hasMore: boolean;
  nextCursor?: string | null;
}

function getContentEndpoint(
  userId: string,
  type: ContentTab,
  cursor?: string,
): string {
  switch (type) {
    case "posts":
      return `/api/users/${userId}?type=posts${cursor ? `&cursor=${cursor}` : ""}`;
    case "reposts":
      return `/api/users/${userId}/repost${cursor ? `?cursor=${cursor}&limit=10` : "?limit=10"}`;
    case "favorites":
      return `/api/users/${userId}/favorite${cursor ? `?cursor=${cursor}&limit=10` : "?limit=10"}`;
    case "replies":
      return `/api/users/${userId}/reply${cursor ? `?cursor=${cursor}&limit=10` : "?limit=10"}`;
  }
}

function parseContentPage(type: ContentTab, data: Record<string, unknown>): ContentPage {
  const rawPosts = (data.posts ?? data.reposts ?? data.replies ?? []) as ApiPostRaw[];
  return {
    posts: rawPosts.map((post) => formatApiPost(post)),
    hasMore: Boolean(data.hasMore),
    nextCursor: (data.nextCursor as string | null | undefined) ?? null,
  };
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const [activeTab, setActiveTab] = useState<ContentTab>("posts");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const hasEnteredLoadMoreRef = useRef(false);
  const { ref: loadMoreRef, inView: isLoadMoreInView } = useInView({
    rootMargin: "0px 0px",
  });

  const {
    data: user,
    isLoading: isUserLoading,
    isStale: isUserStale,
    isFetching: isUserFetching,
    dataUpdatedAt: userUpdatedAt,
    refetch: refetchUser,
  } = useUserProfile(userId);

  const {
    data: ratingHistory = [],
    isLoading: isRatingHistoryLoading,
    isStale: isRatingStale,
    isFetching: isRatingFetching,
    dataUpdatedAt: ratingUpdatedAt,
    refetch: refetchRating,
  } = useUserRatingHistory(userId);

  const {
    data: contentData,
    isLoading: isContentLoading,
    isFetching: isContentFetching,
    isFetchingNextPage,
    isStale: isContentStale,
    dataUpdatedAt: contentUpdatedAt,
    hasNextPage,
    fetchNextPage,
    refetch: refetchContent,
  } = useInfiniteQuery({
    queryKey: queryKeys.userContent(userId, activeTab),
    queryFn: async ({ pageParam }) => {
      const data = await fetchJson<Record<string, unknown>>(
        getContentEndpoint(userId, activeTab, pageParam),
      );
      return parseContentPage(activeTab, data);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!userId,
  });

  useEffect(() => {
    if (user?.isFollowing !== undefined) {
      setIsFollowing(user.isFollowing);
    }
  }, [user?.isFollowing]);

  const posts = contentData?.pages.flatMap((page) => page.posts) ?? [];

  useEffect(() => {
    const entered = isLoadMoreInView && !hasEnteredLoadMoreRef.current;
    if (entered && hasNextPage && !isFetchingNextPage && !isContentLoading) {
      void fetchNextPage();
    }
    hasEnteredLoadMoreRef.current = isLoadMoreInView;
  }, [
    isLoadMoreInView,
    hasNextPage,
    isFetchingNextPage,
    isContentLoading,
    fetchNextPage,
  ]);

  const handleFollow = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    setIsFollowLoading(true);
    try {
      const currentlyFollowing = isFollowing;
      const response = await fetch(`/api/follow/${userId}`, {
        method: currentlyFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 409 && !currentlyFollowing) {
        setIsFollowing(true);
        toast.success("既にフォロー済みです");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "フォロー状態の更新に失敗しました");
      }

      setIsFollowing(!currentlyFollowing);
      void refetchUser();
      toast.success(currentlyFollowing ? "フォロー解除しました" : "フォローしました");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "操作に失敗しました";
      toast.error(
        errorMessage === "Already following this user"
          ? "既にフォロー済みです"
          : errorMessage,
      );
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isUserLoading && !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className="size-20 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-gray-800 p-8 text-center">
        ユーザーが見つかりません
      </div>
    );
  }

  const emptyMessages: Record<ContentTab, string> = {
    posts: "まだ投稿がありません",
    reposts: "まだ拡散した投稿はありません",
    favorites: "まだお気に入りの投稿はありません",
    replies: "まだ返信した投稿はありません",
  };

  return (
    <>
      {isUserStale && (
        <StaleRefreshBanner
          isStale={isUserStale}
          isFetching={isUserFetching}
          dataUpdatedAt={userUpdatedAt}
          onRefresh={() => void refetchUser()}
          label="プロフィールを更新"
        />
      )}

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col md:flex-row md:items-start md:space-x-4">
              <Avatar className="mb-4 size-20 md:mb-0">
                <AvatarImage src={user.icon ?? undefined} alt={user.username} />
                <AvatarFallback>{user.username[0]}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold">{user.username}</h1>
              <p className="text-sm text-gray-500">@{user.id}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {session?.user?.id === userId ? (
                  <>
                    <Button onClick={() => router.push("/editprofile")} variant="outline">
                      プロフィールを編集
                    </Button>
                    <Button variant="secondary" onClick={() => router.push(`/followgraph/${user.id}`)}>
                      <BarChart className="mr-2 size-4" />
                      フォローグラフ
                    </Button>
                    <Button variant="secondary" onClick={() => router.push(`/question/${user.id}`)}>
                      <MessageCircle className="mr-2 size-4" />
                      質問
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                      variant={isFollowing ? "outline" : "default"}
                    >
                      {isFollowLoading ? (
                        <LoaderCircle className="mr-2 size-4 animate-spin" />
                      ) : isFollowing ? (
                        <>
                          <UserMinus className="mr-2 size-4" />
                          フォロー解除
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 size-4" />
                          フォロー
                        </>
                      )}
                    </Button>
                    <Button variant="secondary" onClick={() => router.push(`/chat/${user.id}`)}>
                      <Send className="mr-2 size-4" />
                      チャット
                    </Button>
                    <Button variant="secondary" onClick={() => router.push(`/followgraph/${user.id}`)}>
                      <BarChart className="mr-2 size-4" />
                      フォローグラフ
                    </Button>
                    <Button variant="secondary" onClick={() => router.push(`/question/${user.id}`)}>
                      <MessageCircle className="mr-2 size-4" />
                      質問
                    </Button>
                  </>
                )}
              </div>

              {user.profile && (
                <p className="mt-4 text-gray-300">{linkify(user.profile)}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-400">
                <div className="flex items-center">
                  <MessageSquare className="mr-2 size-4" />
                  投稿 {user.postCount}
                </div>
                <div className="flex items-center">
                  <BarChart className="mr-2 size-4" />
                  レート {user.rate}
                </div>
                <Button
                  variant="link"
                  className="h-auto p-0 text-gray-400 hover:text-white"
                  onClick={() => router.push(`/user/${user.id}/following`)}
                >
                  <Users className="mr-2 size-4" />
                  フォロー中 {user.followingCount}
                </Button>
                <Button
                  variant="link"
                  className="h-auto p-0 text-gray-400 hover:text-white"
                  onClick={() => router.push(`/user/${user.id}/follower`)}
                >
                  <Users className="mr-2 size-4" />
                  フォロワー {user.followersCount}
                </Button>
                <div className="flex items-center">
                  <Calendar className="mr-2 size-4" />
                  <div className="flex flex-col">
                    <span>{formatDistanceToNow(new Date(user.createdAt))}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(user.createdAt), "yyyy年MM月dd日 HH:mm")}
                    </span>
                  </div>
                </div>
              </div>
              </div>
            </div>

            <RatingChartSection
              className="w-full shrink-0 border-t border-border pt-4 lg:w-72 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 xl:w-80"
              history={ratingHistory}
              isLoading={isRatingHistoryLoading}
              isStale={isRatingStale}
              isFetching={isRatingFetching}
              dataUpdatedAt={ratingUpdatedAt}
              onRefresh={() => void refetchRating()}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["posts", MessageSquare, "投稿"],
            ["reposts", RefreshCw, "拡散"],
            ["favorites", Star, "お気に入り"],
            ["replies", MessageSquare, "返信"],
          ] as const
        ).map(([tab, Icon, label]) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "ghost"}
            onClick={() => setActiveTab(tab)}
            className="grow sm:grow-0"
          >
            <Icon className="mr-2 size-4" />
            {label}
          </Button>
        ))}
      </div>

      {isContentStale && posts.length > 0 && (
        <StaleRefreshBanner
          isStale={isContentStale}
          isFetching={isContentFetching}
          dataUpdatedAt={contentUpdatedAt}
          onRefresh={() => void refetchContent()}
          label="投稿一覧を更新"
        />
      )}

      {isContentLoading && posts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="size-20 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-gray-800 p-8 text-center">
          <p className="text-gray-500">{emptyMessages[activeTab]}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostComponent
              key={post.id + String(post.repostedAt ?? "")}
              post={post}
            />
          ))}
          {hasNextPage && (
            <div ref={loadMoreRef} className="mt-6 flex justify-center py-2">
              {isFetchingNextPage ? (
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
    </>
  );
}
