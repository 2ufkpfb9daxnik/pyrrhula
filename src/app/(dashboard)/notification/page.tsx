"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import {
  MessageCircle,
  Heart,
  UserPlus,
  LoaderCircle,
  HelpCircle,
  MessageSquare,
  Bell,
  Share2,
  ShieldCheck,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

// 通知の型定義を更新
interface Notification {
  id: string;
  type:
    | "fol"
    | "fav"
    | "msg"
    | "rep"
    | "mention"
    | "anon_q"
    | "answer"
    | "list_admin_invite"
    | "list_admin_request";
  createdAt: string;
  isRead: boolean;
  sender?: {
    id: string;
    username: string;
    icon: string | null;
  };
  relatedPost?: {
    id: string;
    content: string;
  };
  question?: {
    id: string;
    question: string;
    answer: string | null;
    targetUserId: string;
  };
  chat?: {
    id: string;
    message: string;
  };
  list?: {
    id: string;
    name: string;
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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchNotifications();
    markAllNotificationsAsRead();
  }, []);

  const fetchNotifications = async () => {
    try {
      setError(null);
      const url = `/api/notifications${cursor ? `?cursor=${cursor}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "通知の取得に失敗しました");
      }

      const data: NotificationsResponse = await response.json();

      setNotifications((prev) =>
        cursor ? [...prev, ...data.notifications] : data.notifications
      );
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "通知の取得に失敗しました";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!session?.user) return;

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "通知の既読処理に失敗しました");
      }

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error("既読処理エラー:", error);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "通知の既読処理に失敗しました");
      }

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error("個別既読処理エラー:", error);
    }
  };

  const getNotificationContent = (notification: Notification) => {
    const senderName = notification.sender?.username || "不明なユーザー";
    const listName = notification.list?.name || "リスト";

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
      case "anon_q":
        return "匿名の質問が届きました";
      case "answer":
        return `${senderName}さんがあなたの質問に回答しました`;
      case "list_admin_invite":
        return `${senderName}さんがあなたを${listName}の管理者に招待しています`;
      case "list_admin_request":
        return notification.sender
          ? `${senderName}さんがあなたを${listName}の管理者として承認しました`
          : `${listName}の管理者申請が却下されました`;
      default:
        return "新しい通知があります";
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "fol":
        return <UserPlus className="size-4 text-blue-400" />;
      case "fav":
        return <Heart className="size-4 text-pink-400" />;
      case "msg":
        return <MessageCircle className="size-4 text-green-400" />;
      case "rep":
        return <Share2 className="size-4 text-purple-400" />;
      case "mention":
        return <MessageCircle className="size-4 text-amber-400" />;
      case "anon_q":
        return <HelpCircle className="size-4 text-blue-400" />;
      case "answer":
        return <MessageSquare className="size-4 text-green-400" />;
      case "list_admin_invite":
      case "list_admin_request":
        return <ShieldCheck className="size-4 text-yellow-400" />;
      default:
        return <Bell className="size-4 text-gray-400" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markNotificationAsRead(notification.id);
    }

    try {
      // リスト関連の通知
      if (
        notification.type.startsWith("list_admin_") &&
        notification.list?.id
      ) {
        router.push(`/lists/${notification.list.id}`);
        return;
      }

      // 質問関連通知
      if (notification.type === "anon_q" || notification.type === "answer") {
        if (notification.question?.id && notification.question?.targetUserId) {
          const targetUserId = notification.question.targetUserId;
          router.push(`/question/${targetUserId}/${notification.question.id}`);
          return;
        }

        console.debug("質問通知データ:", {
          type: notification.type,
          questionData: notification.question,
        });

        throw new Error(
          "質問データが不完全です (ID: " +
            notification.question?.id +
            ", targetUserId: " +
            notification.question?.targetUserId +
            ")"
        );
      }

      // 投稿関連通知
      if (notification.relatedPost?.id) {
        router.push(`/post/${notification.relatedPost.id}`);
        return;
      }

      // チャット関連通知
      if (notification.type === "msg" && notification.chat?.id) {
        router.push(`/chat/${notification.chat.id}`);
        return;
      }

      // その他の通知は送信者のプロフィールへ
      if (notification.sender?.id) {
        router.push(`/user/${notification.sender.id}`);
        return;
      }

      throw new Error("遷移先が見つかりません");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "通知の処理に失敗しました";

      toast.error(errorMessage);
      console.error("通知クリック処理エラー:", {
        error,
        notification,
        questionData: notification.question,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="size-10 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-4 text-center">
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
          <p className="text-red-400">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setIsLoading(true);
              setError(null);
              fetchNotifications();
            }}
          >
            再読み込み
          </Button>
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <h1 className="mb-6 text-2xl font-bold">通知</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-800 bg-gray-900 p-8">
          <Bell className="mb-4 size-10 text-gray-500" />
          <p className="text-gray-400">通知はありません</p>
        </div>
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
            className={`rounded-lg border ${
              notification.isRead
                ? "border-gray-800"
                : "border-blue-800 bg-gray-900/60"
            } cursor-pointer bg-gray-900 p-4 transition-colors hover:bg-gray-800/50`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start space-x-4">
              {notification.sender ? (
                <Avatar className="size-10 shrink-0">
                  <AvatarImage
                    src={notification.sender.icon || undefined}
                    alt={notification.sender.username}
                  />
                  <AvatarFallback>
                    {notification.sender.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-800">
                  <Shield className="size-5 text-gray-400" />
                </div>
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

              {!notification.isRead && (
                <span className="size-2 rounded-full bg-blue-500"></span>
              )}
            </div>

            {notification.relatedPost && (
              <p className="mt-2 line-clamp-2 pl-14 text-sm text-gray-400">
                {notification.relatedPost.content}
              </p>
            )}

            {notification.question && (
              <p className="mt-2 line-clamp-2 pl-14 text-sm text-gray-400">
                質問: {notification.question.question}
              </p>
            )}

            {notification.type === "msg" && notification.chat && (
              <p className="mt-2 line-clamp-2 pl-14 text-sm text-gray-400">
                {notification.chat.message}
              </p>
            )}

            {notification.type.startsWith("list_admin_") &&
              notification.list && (
                <p className="mt-2 line-clamp-2 pl-14 text-sm text-gray-400">
                  リスト: {notification.list.name}
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
