"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { Star, Calendar, Trophy } from "lucide-react";

interface User {
  id: string;
  username: string;
  icon: string | null;
  rate: number;
  postCount: number;
  createdAt: string;
  isFollowing?: boolean;
  isFollower?: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sortBy, setSortBy] = useState<"rate" | "createdAt">("rate");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchUsers();
  }, [sortBy]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/users?sort=${sortBy}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!session) {
      router.push("/login");
      return;
    }
    // フォロー処理の実装
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
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
            登録日順
          </Button>
        </div>
      </div>

      <div>
        {users.map((user) => (
          <div
            key={user.id}
            className="border-b border-gray-800 px-4 py-3 hover:bg-gray-900/50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  className="p-0"
                  onClick={() => router.push(`/user/${user.id}`)}
                >
                  <Avatar className="size-12">
                    <AvatarImage
                      src={user.icon ?? undefined}
                      alt={user.username}
                    />
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                </Button>
                <div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      className="p-0 text-base font-semibold hover:underline"
                      onClick={() => router.push(`/user/${user.id}`)}
                    >
                      {user.username}
                    </Button>
                    <span className="text-sm text-gray-500">@{user.id}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-400">
                    <span className="flex items-center">
                      <Star className="mr-1 size-4" />
                      {user.rate}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="mr-1 size-4" />
                      {formatDistanceToNow(new Date(user.createdAt))}前
                    </span>
                    {user.isFollower && (
                      <span className="text-gray-500">フォロワー</span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant={user.isFollowing ? "default" : "outline"}
                onClick={() => handleFollow(user.id)}
                disabled={!session}
              >
                {user.isFollowing ? "フォロー中" : "フォローする"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
