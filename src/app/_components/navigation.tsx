"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Home,
  Search,
  Bell,
  MessageCircle,
  User,
  Share2,
  Globe,
  LogOut,
  LogIn,
} from "lucide-react";
import { useNotifications } from "@/app/_hooks/useNotifications";
import type { Notification } from "@/app/_types/notification"; // この行を追加

export function Navigation() {
  const router = useRouter();
  const { data: session } = useSession();
  const { hasUnread, markAsRead, lastNotification } = useNotifications();

  const handleProfileClick = () => {
    if (session?.user?.id) {
      router.push(`/user/${session.user.id}`);
    } else {
      router.push("/login");
    }
  };
  const handleNotificationClick = () => {
    markAsRead();
    router.push("/notification");
  };

  function getNotificationText(notification: Notification): string {
    switch (notification.type) {
      case "fol":
        return `${notification.sender?.username}さんにフォローされました`;
      case "fav":
        return `${notification.sender?.username}さんが投稿をお気に入りに追加しました`;
      case "msg":
        return `${notification.sender?.username}さんからメッセージが届きました`;
      case "rep":
        return `${notification.sender?.username}さんが投稿を拡散しました`;
      case "reply":
        return `${notification.sender?.username}さんが投稿にリプライしました`;
      default:
        return "新しい通知があります";
    }
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-gray-800 bg-background md:left-0 md:top-0 md:h-screen md:w-16 md:flex-col md:items-center md:justify-start md:space-y-4 md:border-r md:border-t-0 md:p-4">
      {/* ホームボタン */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/home")}
        title="ホーム"
        className="md:w-full"
      >
        <Home className="size-6" />
      </Button>

      {/* 検索ボタン */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/search")}
        title="検索"
        className="md:w-full"
      >
        <Search className="size-6" />
      </Button>

      {/* 通知ボタン */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNotificationClick}
          title={
            lastNotification
              ? `最新の通知: ${getNotificationText(lastNotification)}`
              : "通知"
          }
          className="md:w-full"
        >
          <Bell className="size-6" />
          {hasUnread && (
            <span className="absolute -right-1 -top-1 size-3 rounded-full bg-red-500" />
          )}
        </Button>
      </div>

      {/* チャットボタン */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/chat")}
        title="チャット"
        className="md:w-full"
      >
        <MessageCircle className="size-6" />
      </Button>

      {/* プロフィールボタン - ユーザー関連ページへのアクセスポイント */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleProfileClick}
        title="プロフィール/ユーザー"
        className="md:w-full"
      >
        <User className="size-6" />
      </Button>

      {/* 全体タイムラインボタン */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/whole")}
        title="全体タイムライン"
        className="md:w-full"
      >
        <Globe className="size-6" />
      </Button>

      {/* ログイン/ログアウトボタン */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push(session ? "/logout" : "/login")}
        title={session ? "ログアウト" : "ログイン"}
        className="md:w-full"
      >
        {session ? <LogOut className="size-6" /> : <LogIn className="size-6" />}
      </Button>
    </nav>
  );
}
