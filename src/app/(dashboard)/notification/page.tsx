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
} from "lucide-react";
import { toast } from "sonner";
import { Share2 } from "lucide-react";

// 通知の型定義を修正
interface Notification {
  id: string;
  type: "fol" | "fav" | "msg" | "rep" | "mention" | "anon_q" | "answer";
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
    targetUserId: string; // 質問の対象者ID
  };
  chat?: {
    id: string;
    message: string;
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

  // 初期データ取得
  useEffect(() => {
    fetchNotifications();
    markAllNotificationsAsRead();
  }, []);

  // 通知データ取得
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

      // カーソルに応じてデータ更新
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

  // 全通知を既読にする
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

      // ローカル状態を更新
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error("既読処理エラー:", error);
      // UI体験を妨げないためユーザーには通知しない
    }
  };

  // 個別の通知を既読にする
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

      // ローカル状態を更新
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

  // 通知内容の生成
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
      case "anon_q":
        return "匿名の質問が届きました";
      case "answer":
        return `${senderName}さんがあなたの質問に回答しました`;
      default:
        return "新しい通知があります";
    }
  };

  // 通知アイコンの生成を修正
  const getNotificationIcon = (
    type: "fol" | "fav" | "msg" | "rep" | "mention" | "anon_q" | "answer"
  ) => {
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
    }
  };

  // 通知クリック時のハンドラーを修正
  const handleNotificationClick = (notification: Notification) => {
    // 未読なら既読にする
    if (!notification.isRead) {
      markNotificationAsRead(notification.id);
    }

    try {
      // 質問関連通知
      if (notification.type === "anon_q" || notification.type === "answer") {
        if (notification.question?.id) {
          const targetUserId = notification.question.targetUserId;
          router.push(`/question/${targetUserId}/${notification.question.id}`);
          return;
        }
        throw new Error("質問データが見つかりません");
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

      // 該当なしの場合
      throw new Error("遷移先が見つかりません");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "通知の処理に失敗しました";

      toast.error(errorMessage);
      console.error("通知クリック処理エラー:", { error, notification });
    }
  };

  // ローディング表示
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="size-10 animate-spin text-gray-500" />
      </div>
    );
  }

  // エラー表示
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

  // 通知がない場合
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

  // 通知リスト表示
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
                  <Bell className="size-5 text-gray-400" />
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

            {/* 関連コンテンツの表示 */}
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
