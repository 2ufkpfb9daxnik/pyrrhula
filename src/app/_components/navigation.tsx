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
  Users,
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

  const handleFollowGraphClick = () => {
    if (session?.user?.id) {
      router.push(`/followgraph/${session.user.id}`);
    } else {
      router.push("/login");
    }
  };

  return (
    <nav className="fixed left-0 top-0 flex h-full w-16 flex-col items-center justify-start space-y-8 bg-gray-900 py-8">
      <Button variant="ghost" size="icon" onClick={() => router.push("/home")}>
        <Home className="size-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/search")}
      >
        <Search className="size-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/notification")}
      >
        <Bell className="size-6" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => router.push("/chat")}>
        <MessageCircle className="size-6" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleProfileClick}>
        <User className="size-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/followgraph")}
      >
        <Share2 className="size-6" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleFollowGraphClick}>
        <Users className="size-6" />
      </Button>
    </nav>
  );
}
