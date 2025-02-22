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

export function Navigation() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleProfileClick = () => {
    if (session?.user?.id) {
      router.push(`/user/${session.user.id}`);
    } else {
      router.push("/login");
    }
  };

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
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/notification")}
        title="通知"
        className="md:w-full"
      >
        <Bell className="size-6" />
      </Button>

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

      {/* 全体タイムラインボタン - デスクトップのみ */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/whole")}
        title="全体タイムライン"
        className="hidden md:flex md:w-full"
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
