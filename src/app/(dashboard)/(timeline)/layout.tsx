"use client";

import { useState, useEffect, ReactNode, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navigation } from "@/app/_components/navigation";
import { MakePost } from "@/app/_components/makepost";
import { Search } from "@/app/_components/search";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Globe,
  LayoutList,
  ListChecks,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserInfo {
  icon: string | null;
  username: string;
  id: string;
}

interface List {
  id: string;
  name: string;
}

type TabType =
  | "following"
  | "global"
  | "lists"
  | `list-${string}`
  | `followed-list-${string}`;

export default function TimelineLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("following");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userLists, setUserLists] = useState<List[]>([]);
  const [followedLists, setFollowedLists] = useState<List[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [parentPost, setParentPost] = useState<any | null>(null);
  const postInputRef = useRef<HTMLTextAreaElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname === "/" || pathname === "/home") {
      setActiveTab("following");
    } else if (pathname === "/whole") {
      setActiveTab("global");
    } else if (pathname === "/lists") {
      setActiveTab("lists");
    } else if (pathname.startsWith("/lists/")) {
      const listId = pathname.split("/")[2];
      setActiveTab(`list-${listId}`);
    }
  }, [pathname]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserInfo();
      fetchUserLists();
      fetchFollowedLists();
    }
  }, [session?.user?.id]);

  const handleUserClick = () => {
    if (session?.user?.id) {
      router.push(`/user/${session.user.id}`);
    }
  };

  const fetchUserInfo = async () => {
    if (!session?.user?.id) return;
    try {
      const response = await fetch(`/api/users/${session.user.id}`);
      if (!response.ok) throw new Error("Failed to fetch user info");
      const data = await response.json();
      setUserInfo(data);
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const fetchUserLists = async () => {
    if (!session?.user?.id) return;
    try {
      setIsLoadingLists(true);
      const response = await fetch("/api/lists?isMember=true");
      if (!response.ok) throw new Error("Failed to fetch user lists");
      const data = await response.json();
      setUserLists(data.lists || []);
    } catch (error) {
      console.error("Error fetching user lists:", error);
      setUserLists([]);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const fetchFollowedLists = async () => {
    if (!session?.user?.id) return;
    try {
      const response = await fetch("/api/lists/followed");
      if (!response.ok) throw new Error("Failed to fetch followed lists");
      const data = await response.json();
      setFollowedLists(data.lists || []);
    } catch (error) {
      console.error("Error fetching followed lists:", error);
      setFollowedLists([]);
    }
  };

  const handleTabChange = (value: TabType) => {
    if (value === "following") {
      router.push("/home");
    } else if (value === "global") {
      router.push("/whole");
    } else if (value === "lists") {
      router.push("/lists");
    } else if (value.startsWith("list-")) {
      const listId = value.replace("list-", "");
      router.push(`/lists/${listId}`);
    } else if (value.startsWith("followed-list-")) {
      const listId = value.replace("followed-list-", "");
      router.push(`/lists/${listId}`);
    }
    setActiveTab(value);
  };

  const handleScroll = (direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      const targetScroll =
        tabsContainerRef.current.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);
      tabsContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    }
  };

  const handlePostCreated = (newPost: any) => {
    toast.success("投稿が作成されました");
  };

  const handleSearch = (query: string) => {
    toast.info(`「${query}」で検索中...`);
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (activeTab === "following") handleTabChange("global");
    },
    onSwipedRight: () => {
      if (activeTab === "global") handleTabChange("following");
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0 md:pl-16">
      <div className="md:hidden">
        <Navigation />
      </div>

      <div className="hidden md:block">
        <Navigation />
      </div>

      {session && (
        <div className="fixed hidden h-full w-80 flex-col gap-4 border-r border-gray-800 p-4 md:left-16 md:top-0 md:flex">
          <button
            onClick={handleUserClick}
            className="flex w-full items-start space-x-3 border-b border-gray-800 pb-4 text-left transition-colors hover:bg-gray-800/50"
          >
            <div className="flex items-start space-x-3 border-gray-800">
              <Avatar className="size-12">
                <AvatarImage src={userInfo?.icon ?? undefined} />
                <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold">{session?.user?.name}</span>
                <span className="text-sm text-muted-foreground">
                  @{session?.user?.id}
                </span>
              </div>
            </div>
          </button>

          <MakePost
            onPostCreated={handlePostCreated}
            replyTo={
              parentPost
                ? {
                    id: parentPost.id,
                    content: parentPost.content,
                    username: parentPost.user.username,
                  }
                : undefined
            }
            inputRef={postInputRef}
          />

          <Search onSearch={handleSearch} />
        </div>
      )}

      <div className="flex-1">
        <div className="mx-auto max-w-2xl md:ml-96">
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md">
            <div className="relative flex border-b border-gray-800">
              <button
                onClick={() => handleScroll("left")}
                className="absolute left-0 top-0 z-10 h-full bg-gradient-to-r from-background via-background/90 to-transparent px-2 hover:from-gray-800/50"
              >
                <ChevronLeft className="size-4" />
              </button>

              <div
                ref={tabsContainerRef}
                className="scrollbar-none flex flex-1 overflow-x-auto"
                style={{ scrollBehavior: "smooth" }}
              >
                <div className="flex items-center">
                  {/* メインナビゲーション */}
                  <button
                    className={cn(
                      "relative flex min-w-[120px] items-center justify-center py-3 font-medium transition-colors",
                      activeTab === "following"
                        ? "text-primary"
                        : "text-gray-500 hover:text-gray-300"
                    )}
                    onClick={() => handleTabChange("following")}
                  >
                    <Users className="mr-2 size-4" />
                    フォロー中
                    {activeTab === "following" && (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-primary" />
                    )}
                  </button>

                  <button
                    className={cn(
                      "relative flex min-w-[120px] items-center justify-center py-3 font-medium transition-colors",
                      activeTab === "global"
                        ? "text-primary"
                        : "text-gray-500 hover:text-gray-300"
                    )}
                    onClick={() => handleTabChange("global")}
                  >
                    <Globe className="mr-2 size-4" />
                    全体
                    {activeTab === "global" && (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-primary" />
                    )}
                  </button>

                  <button
                    className={cn(
                      "relative flex min-w-[120px] items-center justify-center py-3 font-medium transition-colors",
                      activeTab === "lists"
                        ? "text-primary"
                        : "text-gray-500 hover:text-gray-300"
                    )}
                    onClick={() => handleTabChange("lists")}
                  >
                    <LayoutList className="mr-2 size-4" />
                    リスト
                    {activeTab === "lists" && (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-primary" />
                    )}
                  </button>

                  {/* セパレータ - メンバーリスト */}
                  {!isLoadingLists && userLists?.length > 0 && (
                    <div className="mx-2 my-3 w-px bg-gray-800" />
                  )}

                  {/* 参加中のリスト */}
                  {!isLoadingLists &&
                    userLists?.map((list) => (
                      <button
                        key={list.id}
                        className={cn(
                          "relative flex min-w-[120px] items-center justify-center py-3 font-medium transition-colors",
                          activeTab === `list-${list.id}`
                            ? "text-primary"
                            : "text-gray-500 hover:text-gray-300"
                        )}
                        onClick={() => handleTabChange(`list-${list.id}`)}
                      >
                        <ListChecks className="mr-2 size-4" />
                        {list.name}
                        {activeTab === `list-${list.id}` && (
                          <span className="absolute inset-x-0 bottom-0 h-1 bg-primary" />
                        )}
                      </button>
                    ))}

                  {/* セパレータ - フォローリスト */}
                  {followedLists?.length > 0 && (
                    <div className="mx-2 my-3 w-px bg-gray-800" />
                  )}

                  {/* フォロー中のリスト */}
                  {followedLists?.map((list) => (
                    <button
                      key={list.id}
                      className={cn(
                        "relative flex min-w-[120px] items-center justify-center py-3 font-medium transition-colors",
                        activeTab === `followed-list-${list.id}`
                          ? "text-primary"
                          : "text-gray-500 hover:text-gray-300"
                      )}
                      onClick={() =>
                        handleTabChange(`followed-list-${list.id}`)
                      }
                    >
                      <Star className="mr-2 size-4" />
                      {list.name}
                      {activeTab === `followed-list-${list.id}` && (
                        <span className="absolute inset-x-0 bottom-0 h-1 bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleScroll("right")}
                className="absolute right-0 top-0 z-10 h-full bg-gradient-to-l from-background via-background/90 to-transparent px-2 hover:from-gray-800/50"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div {...swipeHandlers} className="touch-pan-y">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
