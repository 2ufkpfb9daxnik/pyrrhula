"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
import type { Post } from "@/app/_types/post";
import { Post as PostComponent } from "@/app/_components/post";
import { Navigation } from "@/app/_components/navigation";
import { RatingChart } from "@/app/_components/RatingChart";
import { toast } from "sonner";
import { format } from "date-fns";
import { LoaderCircle } from "lucide-react";
import { linkify } from "@/lib/linkify";

interface UserDetail {
  id: string;
  username: string;
  icon: string | null;
  profile: string | null;
  postCount: number;
  rate: number;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

interface RatingHistory {
  delta: number;
  rating: number;
  createdAt: string;
  reason?: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [ratingHistory, setRatingHistory] = useState<RatingHistory[]>([]);
  const [activeTab, setActiveTab] = useState<
    "posts" | "reposts" | "favorites" | "replies"
  >("posts");
  const [isLoading, setIsLoading] = useState(true);
  const [isRatingHistoryLoading, setIsRatingHistoryLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (!userId) return;

    fetchUserDetails();
    fetchRatingHistory();
    // タブが変わったときはカーソルをリセット
    setNextCursor(null);
    fetchUserContent(activeTab);
  }, [userId, activeTab]);

  const fetchRatingHistory = async () => {
    try {
      setIsRatingHistoryLoading(true);
      const response = await fetch(`/api/users/${userId}/rating/history`);
      if (!response.ok) throw new Error("Failed to fetch rating history");
      const data = await response.json();
      setRatingHistory(data.ratingHistory);
    } catch (error) {
      console.error("Error fetching rating history:", error);
      toast.error("レート履歴の取得に失敗しました");
    } finally {
      setIsRatingHistoryLoading(false);
    }
  };

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        next: { revalidate: 60 }, // キャッシュを60秒間有効にする
      });
      if (!response.ok) throw new Error("Failed to fetch user details");
      const data = await response.json();
      setUser(data);
      setIsFollowing(data.isFollowing);
    } catch (error) {
      console.error("Error fetching user details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserContent = async (
    type: "posts" | "reposts" | "favorites" | "replies",
    cursor: string | null = null
  ) => {
    try {
      // 初回読み込みの場合は投稿をクリア、追加読み込みの場合はクリアしない
      if (!cursor) {
        setPosts([]);
      }

      cursor ? setIsLoadingMore(true) : setIsContentLoading(true);

      let formattedPosts;

      // タイプに応じたエンドポイントを選択
      let endpoint = `/api/users/${userId}`;
      switch (type) {
        case "posts":
          endpoint = `/api/users/${userId}?type=posts${cursor ? `&cursor=${cursor}` : ""}`;
          break;
        case "reposts":
          endpoint = `/api/users/${userId}/repost${cursor ? `?cursor=${cursor}` : ""}`;
          break;
        case "favorites":
          endpoint = `/api/users/${userId}/favorite${cursor ? `?cursor=${cursor}` : ""}`;
          break;
        case "replies":
          endpoint = `/api/users/${userId}/reply${cursor ? `?cursor=${cursor}` : ""}`;
          break;
      }

      const response = await fetch(endpoint);

      if (response.status === 404) {
        if (!cursor) setPosts([]);
        setHasMore(false);
        setNextCursor(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch user ${type}`);
      }

      const data = await response.json();

      // hasMoreとnextCursorの状態を更新
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);

      // レスポンスの形式に応じてデータを整形（質問情報を含む）
      switch (type) {
        case "reposts":
          if (!data.reposts) {
            formattedPosts = [];
            break;
          }
          formattedPosts = data.reposts.map((post: any) => ({
            ...post,
            createdAt: new Date(post.createdAt),
            repostedAt: new Date(post.repostedAt),
            user: post.user || post.post?.user,
            content: post.content || post.post?.content,
            parent: post.parent
              ? {
                  id: post.parent.id,
                  content: post.parent.content,
                  user: post.parent.user,
                }
              : undefined,
            _count: {
              replies: post._count?.replies || 0,
            },
            images: post.images || [],
            // 質問情報を追加 - post自体またはpost.postから取得
            question: post.question || post.post?.question,
          }));
          break;

        case "favorites":
          if (!data.posts) {
            formattedPosts = [];
            break;
          }
          formattedPosts = data.posts.map((post: any) => ({
            ...post,
            createdAt: new Date(post.createdAt),
            favoritedAt: new Date(post.favoritedAt),
            user: post.user,
            content: post.content,
            // 質問情報を追加
            question: post.question,
            images: post.images || [],
          }));
          break;

        case "replies":
          if (!data.replies) {
            formattedPosts = [];
            break;
          }
          formattedPosts = data.replies.map((post: any) => ({
            ...post,
            createdAt: new Date(post.createdAt),
            // 質問情報を追加
            question: post.question,
            images: post.images || [],
          }));
          break;

        default: // posts
          formattedPosts = (data.posts || []).map((post: any) => ({
            ...post,
            createdAt: new Date(post.createdAt),
            // 質問情報を明示的に追加
            question: post.question,
            images: post.images || [],
          }));
          break;
      }

      // カーソルがある場合は既存の投稿と新しい投稿を結合
      if (cursor) {
        setPosts((prev) => [...prev, ...formattedPosts]);
      } else {
        setPosts(formattedPosts);
      }
    } catch (error) {
      console.error(`Error fetching user ${type}:`, error);
      toast.error(
        `${
          type === "posts"
            ? "投稿"
            : type === "reposts"
              ? "拡散した投稿"
              : type === "favorites"
                ? "お気に入りの投稿"
                : "返信"
        }の取得に失敗しました`
      );
      if (!cursor) setPosts([]);
      setHasMore(false);
      setNextCursor(null);
    } finally {
      cursor ? setIsLoadingMore(false) : setIsContentLoading(false);
    }
  };

  // さらに読み込むボタンのハンドラ
  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      fetchUserContent(activeTab, nextCursor);
    }
  };

  const handleFollow = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    setIsFollowLoading(true);
    try {
      // リクエストを送信する前に、現在のフォロー状態を確認
      const currentlyFollowing = isFollowing;

      // フォロー状態に応じて適切なメソッドを選択
      const response = await fetch(`/api/follow/${userId}`, {
        method: currentlyFollowing ? "DELETE" : "POST",
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
        if (!currentlyFollowing) {
          setIsFollowing(true);
          setUser(
            (prev) =>
              prev && {
                ...prev,
                followersCount: prev.followersCount + 1,
              }
          );
          toast.success("既にフォロー済みです");
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "フォロー状態の更新に失敗しました");
      }

      // 成功時の処理
      setIsFollowing(!currentlyFollowing);
      setUser(
        (prev) =>
          prev && {
            ...prev,
            followersCount: prev.followersCount + (currentlyFollowing ? -1 : 1),
          }
      );

      toast.success(
        currentlyFollowing ? "フォロー解除しました" : "フォローしました"
      );
    } catch (error) {
      console.error("Follow error:", error);
      // より具体的なエラーメッセージを表示
      const errorMessage =
        error instanceof Error ? error.message : "操作に失敗しました";
      // Already following this user エラーの場合は友好的なメッセージに変更
      const displayMessage =
        errorMessage === "Already following this user"
          ? "既にフォロー済みです"
          : errorMessage;
      toast.error(displayMessage);
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isLoading) {
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

  return (
    <>
      {/* ユーザープロフィールカード */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:space-x-4">
            <Avatar className="mb-4 size-20 md:mb-0">
              <AvatarImage src={user.icon ?? undefined} alt={user.username} />
              <AvatarFallback>{user.username[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-2xl font-bold">{user.username}</h1>
              <p className="text-sm text-gray-500">@{user.id}</p>

              {/* プロフィール編集またはフォローボタン */}
              <div className="mt-4 flex flex-wrap gap-2">
                {session?.user?.id === userId ? (
                  <>
                    <Button
                      onClick={() => router.push(`/editprofile`)}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      プロフィールを編集
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/followgraph/${user.id}`);
                      }}
                      className="w-full sm:w-auto"
                    >
                      <BarChart className="mr-2 size-4" />
                      フォローグラフ
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/question/${user.id}`)}
                      className="w-full sm:w-auto"
                    >
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
                      className="w-full sm:w-auto"
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
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/chat/${user.id}`)}
                      className="w-full sm:w-auto"
                    >
                      <Send className="mr-2 size-4" />
                      チャット
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/followgraph/${user.id}`);
                      }}
                      className="w-full sm:w-auto"
                    >
                      <BarChart className="mr-2 size-4" />
                      フォローグラフ
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/question/${user.id}`)}
                      className="w-full sm:w-auto"
                    >
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

              {/* レート変動グラフ */}
              {isRatingHistoryLoading ? (
                <div className="mt-4 flex h-[300px] items-center justify-center">
                  <LoaderCircle className="size-8 animate-spin" />
                </div>
              ) : ratingHistory.length > 0 ? (
                <RatingChart history={ratingHistory} />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タブ */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={activeTab === "posts" ? "default" : "ghost"}
          onClick={() => setActiveTab("posts")}
          className="grow sm:grow-0"
        >
          <MessageSquare className="mr-2 size-4" />
          投稿
        </Button>
        <Button
          variant={activeTab === "reposts" ? "default" : "ghost"}
          onClick={() => setActiveTab("reposts")}
          className="grow sm:grow-0"
        >
          <RefreshCw className="mr-2 size-4" />
          拡散
        </Button>
        <Button
          variant={activeTab === "favorites" ? "default" : "ghost"}
          onClick={() => setActiveTab("favorites")}
          className="grow sm:grow-0"
        >
          <Star className="mr-2 size-4" />
          お気に入り
        </Button>
        <Button
          variant={activeTab === "replies" ? "default" : "ghost"}
          onClick={() => setActiveTab("replies")}
          className="grow sm:grow-0"
        >
          <MessageSquare className="mr-2 size-4" />
          返信
        </Button>
      </div>

      {/* 投稿一覧 */}
      {isContentLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="size-20 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-gray-800 p-8 text-center">
          <p className="text-gray-500">
            {activeTab === "posts"
              ? "まだ投稿がありません"
              : activeTab === "reposts"
                ? "まだ拡散した投稿はありません"
                : activeTab === "favorites"
                  ? "まだお気に入りの投稿はありません"
                  : "まだ返信した投稿はありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostComponent
              key={post.id + (post.repostedAt?.toString() || "")}
              post={post}
            />
          ))}

          {/* もっと読み込むボタン */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="w-full max-w-xs"
              >
                {isLoadingMore ? (
                  <div className="flex items-center gap-2">
                    <LoaderCircle className="size-4 animate-spin" />
                    読み込み中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="size-4" />
                    もっと読み込む
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
