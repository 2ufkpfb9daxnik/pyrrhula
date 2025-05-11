"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MakePost } from "./makepost";
import { Search } from "./search";
import { useRef } from "react";

interface UserInfo {
  icon: string | null;
  username: string;
  id: string;
}

type UserInfoPanelProps = {
  userInfo: UserInfo | null;
  onPostCreated: (post: any) => void;
  onSearch: (query: string) => void;
  isColumnView: boolean;
  onViewChange: () => void;
};

export function UserInfoPanel({
  userInfo,
  onPostCreated,
  onSearch,
  isColumnView,
  onViewChange,
}: UserInfoPanelProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const postInputRef = useRef<HTMLTextAreaElement>(null);

  const handleUserClick = () => {
    if (session?.user?.id) {
      router.push(`/user/${session.user.id}`);
    }
  };

  return (
    <div className="space-y-4">
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

      <MakePost onPostCreated={onPostCreated} inputRef={postInputRef} />

      <Search onSearch={onSearch} />

      <div className="mt-8">
        <Button variant="outline" onClick={onViewChange} className="w-full">
          <div className="flex items-center gap-2">
            {isColumnView ? "通常表示に切り替え" : "カラム表示に切り替え"}
          </div>
        </Button>
      </div>
    </div>
  );
}
