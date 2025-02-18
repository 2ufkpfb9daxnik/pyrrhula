"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Repeat,
  MessageCircle,
  UserPlus,
  MessageSquare,
} from "lucide-react";

interface Notification {
  id: string;
  type: "fol" | "fav" | "msg" | "rep" | "reply"; // repost と reply を追加
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    icon: string | null;
  };
  relatedPost?: {
    id: string;
    content: string;
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }
    fetchNotifications();
  }, [session]);

  const fetchNotifications = async () => {
    if (!session) return;

    try {
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error("Failed to fetch notifications");

      const data = await response.json();
      setNotifications(data.notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "fav":
        return <Heart className="size-4 text-pink-500" />;
      case "rep":
        return <Repeat className="size-4 text-green-500" />;
      case "reply":
        return <MessageCircle className="size-4 text-blue-500" />;
      case "fol":
        return <UserPlus className="size-4 text-purple-500" />;
      case "msg":
        return <MessageSquare className="size-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case "fav":
        return "があなたの投稿をいいねしました";
      case "rep":
        return "があなたの投稿をリポストしました";
      case "reply":
        return "があなたの投稿に返信しました";
      case "fol":
        return "があなたをフォローしました";
      case "msg":
        return "からメッセージが届きました";
      default:
        return "";
    }
  };

  const handleUserClick = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const handlePostClick = (postId: string) => {
    router.push(`/post/${postId}`);
  };
  if (!session) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-gray-800 p-8">
          <p className="text-lg text-gray-400">
            通知を表示するにはログインが必要です
          </p>
          <Button onClick={() => router.push("/login")}>ログイン</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        読み込み中...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        通知を表示するにはログインしてください
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">通知</h1>
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-center text-gray-500">通知はありません</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start space-x-4 rounded-lg border border-gray-800 p-4"
            >
              <div className="flex items-center space-x-2">
                {getNotificationIcon(notification.type)}
              </div>
              {notification.sender && (
                <Button
                  variant="ghost"
                  className="p-0"
                  onClick={() => handleUserClick(notification.sender!.id)}
                >
                  <Avatar className="size-10">
                    <AvatarImage
                      src={notification.sender.icon ?? undefined}
                      alt={notification.sender.username}
                    />
                    <AvatarFallback>
                      {notification.sender.username[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              )}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  {notification.sender && (
                    <Button
                      variant="ghost"
                      className="p-0 font-semibold hover:underline"
                      onClick={() => handleUserClick(notification.sender!.id)}
                    >
                      {notification.sender.username}
                    </Button>
                  )}
                  <span className="text-gray-500">
                    {getNotificationText(notification)}
                  </span>
                </div>
                {notification.relatedPost && (
                  <Button
                    variant="ghost"
                    className="mt-2 w-full text-left text-gray-400 hover:text-gray-300"
                    onClick={() =>
                      handlePostClick(notification.relatedPost!.id)
                    }
                  >
                    {notification.relatedPost.content}
                  </Button>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {formatDistanceToNow(new Date(notification.createdAt))}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
