"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { LoaderCircle } from "lucide-react";

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

export default function UserProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<
    "posts" | "reposts" | "favorites" | "replies"
  >("posts");
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    fetchUserDetails();
    fetchUserContent(activeTab);
  }, [params.id, activeTab]);

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`);
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
    type: "posts" | "reposts" | "favorites" | "replies"
  ) => {
    try {
      setPosts([]); // コンテンツ取得前に投稿をクリア
      const response = await fetch(`/api/users/${params.id}?type=${type}`);

      if (response.status === 404) {
        // 404の場合は空の配列を設定（存在しないことを示す）
        setPosts([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch user ${type}`);
      }

      const data = await response.json();

      if (!data.posts || !Array.isArray(data.posts)) {
        setPosts([]);
        return;
      }

      setPosts(
        data.posts.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt),
        }))
      );
    } catch (error) {
      console.error(`Error fetching user ${type}:`, error);
      toast.error(`${type}の取得に失敗しました`);
      setPosts([]);
    }
  };

  const handleFollow = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    setIsFollowLoading(true);
    try {
      const response = await fetch(`/api/follow/${params.id}`, {
        method: isFollowing ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        ...(isFollowing
          ? {
              // DELETE リクエストの場合、URLにクエリパラメータを追加
              url: `/api/follow/${params.id}?userId=${params.id}`,
            }
          : {
              // POST リクエストの場合、bodyにユーザーIDを含める
              body: JSON.stringify({ userId: params.id }),
            }),
      });

      if (!response.ok) throw new Error("Failed to update follow status");

      setIsFollowing(!isFollowing);
      setUser(
        (prev) =>
          prev && {
            ...prev,
            followersCount: prev.followersCount + (isFollowing ? -1 : 1),
          }
      );

      toast.success(isFollowing ? "フォロー解除しました" : "フォローしました");
    } catch (error) {
      console.error("Follow error:", error);
      toast.error("操作に失敗しました");
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Navigation />
        <div className="flex flex-1 items-center justify-center">
          <LoaderCircle className="size-20 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen">
        <Navigation />
        <div className="flex-1">
          <div className="mx-auto max-w-2xl p-4">
            <div className="rounded-lg border border-gray-800 p-8 text-center">
              ユーザーが見つかりません
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <div className="flex-1">
        <div className="mx-auto max-w-2xl p-4">
          {/* ユーザープロフィールカード */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <Avatar className="size-20">
                    <AvatarImage
                      src={user.icon ?? undefined}
                      alt={user.username}
                    />
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold">{user.username}</h1>
                        <p className="text-sm text-gray-500">@{user.id}</p>
                      </div>
                      <div className="mb-4 flex items-center justify-between">
                        {session?.user?.id === params.id && (
                          <Button
                            onClick={() => router.push(`/editprofile`)}
                            variant="outline"
                            className="ml-4"
                          >
                            プロフィールを編集
                          </Button>
                        )}
                      </div>
                      {session?.user?.id !== user.id && (
                        <div className="mt-4 flex flex-col space-y-2">
                          <Button
                            onClick={handleFollow}
                            disabled={isFollowLoading}
                            variant={isFollowing ? "outline" : "default"}
                          >
                            {isFollowing ? (
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
                          >
                            <Send className="mr-2 size-4" />
                            チャット
                          </Button>
                        </div>
                      )}
                    </div>
                    {user.profile && (
                      <p className="mt-2 text-gray-300">{user.profile}</p>
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
                        onClick={() =>
                          router.push(`/user/${user.id}/following`)
                        }
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
                          <span>
                            {formatDistanceToNow(new Date(user.createdAt))}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(
                              new Date(user.createdAt),
                              "yyyy年MM月dd日 HH:mm"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* タブ */}
          <div className="mb-6 flex space-x-4">
            <Button
              variant={activeTab === "posts" ? "default" : "ghost"}
              onClick={() => setActiveTab("posts")}
            >
              <MessageSquare className="mr-2 size-4" />
              投稿
            </Button>
            <Button
              variant={activeTab === "reposts" ? "default" : "ghost"}
              onClick={() => setActiveTab("reposts")}
            >
              <RefreshCw className="mr-2 size-4" />
              拡散
            </Button>
            <Button
              variant={activeTab === "favorites" ? "default" : "ghost"}
              onClick={() => setActiveTab("favorites")}
            >
              <Star className="mr-2 size-4" />
              お気に入り
            </Button>
            <Button
              variant={activeTab === "replies" ? "default" : "ghost"}
              onClick={() => setActiveTab("replies")}
            >
              <MessageCircle className="mr-2 size-4" />
              返信
            </Button>
          </div>

          {/* 投稿一覧 */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="rounded-lg border border-gray-800 p-8 text-center text-gray-500">
                {activeTab === "posts" && "投稿がありません"}
                {activeTab === "reposts" && "拡散した投稿がありません"}
                {activeTab === "favorites" && "お気に入りの投稿がありません"}
                {activeTab === "replies" && "返信した投稿がありません"}
              </div>
            ) : (
              posts.map((post) => (
                <PostComponent
                  key={post.id}
                  post={post}
                  onRepostSuccess={() => fetchUserContent(activeTab)}
                  onFavoriteSuccess={() => fetchUserContent(activeTab)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
