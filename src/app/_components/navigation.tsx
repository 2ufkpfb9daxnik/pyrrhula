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
  Users,
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
    <nav className="fixed bottom-0 left-0 flex w-full flex-row items-center justify-around bg-gray-900 p-2 md:top-0 md:h-full md:w-16 md:flex-col md:justify-start md:space-y-8 md:py-8">
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

      {/* ユーザー一覧ボタン - モバイルでも表示 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/user")}
        title="ユーザー一覧"
        className="md:w-full"
      >
        <Users className="size-6" />
      </Button>

      {/* プロフィールボタン */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleProfileClick}
        title="プロフィール"
        className="md:w-full"
      >
        <User className="size-6" />
      </Button>

      {/* 全体タイムラインボタン - hidden クラスを削除 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/whole")}
        title="全体タイムライン"
        className="md:w-full" // hidden md:flex を削除
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
