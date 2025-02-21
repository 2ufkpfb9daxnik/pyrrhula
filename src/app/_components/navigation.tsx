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
    <nav className="fixed left-0 top-0 flex h-full w-16 flex-col items-center justify-start space-y-8 bg-gray-900 py-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/home")}
        title="ホーム"
      >
        <Home className="size-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/search")}
        title="検索"
      >
        <Search className="size-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/notification")}
        title="通知"
      >
        <Bell className="size-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/chat")}
        title="チャット"
      >
        <MessageCircle className="size-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleProfileClick}
        title="プロフィール"
      >
        <User className="size-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/user")}
        title="ユーザー一覧"
      >
        <Users className="size-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push(session ? "/logout" : "/login")}
        title={session ? "ログアウト" : "ログイン"}
      >
        {session ? <LogOut className="size-6" /> : <LogIn className="size-6" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/whole")}
        title="全体タイムライン"
      >
        <Globe className="size-6" />
      </Button>
    </nav>
  );
}
