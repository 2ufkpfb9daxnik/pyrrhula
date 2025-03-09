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
  LogOut,
  LogIn,
} from "lucide-react";
import { useNotifications } from "@/app/_hooks/useNotifications";
import type { Notification } from "@/app/_types/notification";

type NavigationProps = {
  isMobile?: boolean;
};

export function Navigation({ isMobile = false }: NavigationProps) {
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

  const handleHomeClick = () => {
    router.push("/home");
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
      case "mention":
        return `${notification.sender?.username}さんがあなたをメンションしました`;
      case "anon_q":
        return "匿名の質問が届きました";
      case "answer":
        return `${notification.sender?.username}さんがあなたの質問に回答しました`;
      default:
        return "新しい通知があります";
    }
  }
  // ナビゲーション用のクラスを修正 - 常に固定表示するために fixed クラスを正しく適用
  const navClasses =
    "fixed z-50 bg-background flex items-center justify-around md:flex-col md:items-center md:justify-start md:space-y-4 md:p-4 md:w-16 md:h-screen md:left-0 md:top-0 md:border-r md:border-gray-800 inset-x-0 bottom-0 h-16 border-t border-gray-800";

  return (
    <nav className={navClasses}>
      {/* ホームボタン - フォロー中/全体タイムラインへのアクセスポイント */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleHomeClick}
        title="タイムライン"
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

      {/* ログイン/ログアウトボタン - 条件付きで表示 */}
      {!session ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/login")}
          title="ログイン"
          className="md:w-full"
        >
          <LogIn className="size-6" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/logout")}
          title="ログアウト"
          className="md:w-full"
        >
          <LogOut className="size-6" />
        </Button>
      )}
    </nav>
  );
}
