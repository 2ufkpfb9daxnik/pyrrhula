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
} from "lucide-react";
import type { Post as PostType } from "@/app/_components/post";
import { Post } from "@/app/_components/post";

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

interface UserPost extends Post {
  // Post interfaceを拡張
}

export default function UserProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [activeTab, setActiveTab] = useState<
    "posts" | "reposts" | "favorites" | "replies"
  >("posts");
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    fetchUserDetails();
    fetchUserPosts();
  }, [params.userId]);

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`/api/users/${params.userId}`);
      if (!response.ok) throw new Error("Failed to fetch user details");
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error("Error fetching user details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await fetch(`/api/posts?userId=${params.userId}`);
      if (!response.ok) throw new Error("Failed to fetch user posts");
      const data = await response.json();
      setPosts(data.posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <div className="rounded-lg border border-gray-800 p-8 text-center">
          ユーザーが見つかりません
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      {/* ユーザープロフィールカード */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Avatar className="size-20">
              <AvatarImage src={user.icon ?? undefined} alt={user.username} />
              <AvatarFallback>{user.username[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{user.username}</h1>
              <p className="text-sm text-gray-500">@{user.id}</p>
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
                <div className="flex items-center">
                  <Users className="mr-2 size-4" />
                  <span className="mr-4">フォロワー {user.followersCount}</span>
                  フォロー中 {user.followingCount}
                </div>
                <div className="flex items-center">
                  <Calendar className="mr-2 size-4" />
                  登録日: {formatDistanceToNow(new Date(user.createdAt))}前
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
          onClick={() => {
            setActiveTab("posts");
            router.push(`/user/${params.userId}`);
          }}
        >
          <MessageSquare className="mr-2 size-4" />
          投稿
        </Button>
        <Button
          variant={activeTab === "reposts" ? "default" : "ghost"}
          onClick={() => {
            setActiveTab("reposts");
            router.push(`/user/${params.userId}/reposts`);
          }}
        >
          <RefreshCw className="mr-2 size-4" />
          拡散
        </Button>
        <Button
          variant={activeTab === "favorites" ? "default" : "ghost"}
          onClick={() => {
            setActiveTab("favorites");
            router.push(`/user/${params.userId}/favorites`);
          }}
        >
          <Star className="mr-2 size-4" />
          お気に入り
        </Button>
        <Button
          variant={activeTab === "replies" ? "default" : "ghost"}
          onClick={() => {
            setActiveTab("replies");
            router.push(`/user/${params.userId}/replies`);
          }}
        >
          <MessageCircle className="mr-2 size-4" />
          返信
        </Button>
      </div>

      {/* 投稿一覧 */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="rounded-lg border border-gray-800 p-8 text-center text-gray-500">
            まだ投稿していません
          </div>
        ) : (
          posts.map((post) => <Post key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
