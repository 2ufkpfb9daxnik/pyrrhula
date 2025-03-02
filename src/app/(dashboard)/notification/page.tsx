"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { MessageCircle, Heart, UserPlus, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Share2 } from "lucide-react";

interface Notification {
  id: string;
  type: "fol" | "fav" | "msg" | "rep" | "mention"; // repを追加
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

interface NotificationsResponse {
  notifications: Notification[];
  hasMore: boolean;
  nextCursor?: string;
}

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const url = `/fications${cursor ? `?cursor=${cursor}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch notifications");

      const data: NotificationsResponse = await response.json();
      // カーソルが存在しない（初回ロード）の場合は配列を置き換え、
      // カーソルが存在する（追加ロード）の場合は配列を結合
      setNotifications((prev) =>
        cursor ? [...prev, ...data.notifications] : data.notifications
      );
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("通知の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationContent = (notification: Notification) => {
    const senderName = notification.sender?.username || "不明なユーザー";

    switch (notification.type) {
      case "fol":
        return `${senderName}さんにフォローされました`;
      case "fav":
        return `${senderName}さんが投稿をお気に入りに追加しました`;
      case "msg":
        return `${senderName}さんからメッセージが届きました`;
      case "rep":
        return `${senderName}さんが投稿を拡散しました`;
      case "mention":
        return `${senderName}さんが以下の投稿であなたをメンションしました`;
      default:
        console.log("Unknown notification type:", notification.type); // デバッグ用
        return "新しい通知があります";
    }
  };

  const getNotificationIcon = (
    type: "fol" | "fav" | "msg" | "rep" | "mention"
  ) => {
    switch (type) {
      case "fol":
        return <UserPlus className="size-4 text-blue-400" />;
      case "fav":
        return <Heart className="size-4 text-pink-400" />;
      case "msg":
        return <MessageCircle className="size-4 text-green-400" />;
      case "rep":
        return <Share2 className="size-4 text-purple-400" />; // 紫色で拡散アイコンを表示
      case "mention":
        return <MessageCircle className="size-4 text-amber-400" />; // メンション用のアイコン
    }
  };
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="size-10 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">通知</h1>
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="rounded-lg border border-gray-800 bg-gray-900 p-4"
            onClick={() => {
              if (notification.relatedPost) {
                router.push(`/post/${notification.relatedPost.id}`);
              } else if (notification.sender) {
                router.push(`/user/${notification.sender.id}`);
              }
            }}
          >
            <div className="flex items-start space-x-4">
              {notification.sender && (
                <Avatar className="size-10 shrink-0">
                  <AvatarImage
                    src={notification.sender.icon ?? undefined}
                    alt={notification.sender.username}
                  />
                  <AvatarFallback>
                    {notification.sender.username[0]}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  {getNotificationIcon(notification.type)}
                  <p className="text-sm">
                    {getNotificationContent(notification)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {formatDistanceToNow(new Date(notification.createdAt))}
                </p>
              </div>
            </div>
            {notification.relatedPost && (
              <p className="mt-2 pl-14 text-sm text-gray-400">
                {notification.relatedPost.content}
              </p>
            )}
          </div>
        ))}

        {hasMore && (
          <Button
            variant="outline"
            className="w-full"
            onClick={fetchNotifications}
          >
            さらに読み込む
          </Button>
        )}
      </div>
    </div>
  );
}
