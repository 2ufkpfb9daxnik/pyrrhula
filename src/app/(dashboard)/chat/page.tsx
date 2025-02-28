"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { CreateGroupChatModal } from "@/app/_components/groupchat";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";

interface Chat {
  id: string;
  message: string;
  createdAt: string;
  isOwnMessage: boolean;
  otherUser: {
    id: string;
    username: string;
    icon: string;
  };
}

interface GroupChat {
  id: string;
  name: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    sender: {
      username: string;
    };
  };
  members: {
    user: {
      id: string;
      username: string;
      icon: string;
    };
  }[];
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);

  // グループチャット一覧の取得
  const fetchGroupChats = async () => {
    try {
      const response = await fetch("/api/chat/group");
      if (!response.ok) throw new Error("Failed to fetch group chats");
      const data = await response.json();
      // レスポンスデータを直接設定（.groupChatsプロパティを参照しない）
      setGroupChats(data);
    } catch (error) {
      console.error("Error fetching group chats:", error);
      // エラー時は空配列を設定
      setGroupChats([]);
    }
  };

  useEffect(() => {
    if (session) {
      fetchChats();
      fetchGroupChats();
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }
    fetchChats();
  }, [session]);

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/chat");

      if (response.status === 404) {
        setChats([]);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch chats");
      }

      const data = await response.json();
      setChats(data.chats);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatClick = (otherUserId: string) => {
    router.push(`/chat/${otherUserId}`);
  };

  const getLatestChats = (chats: Chat[]) => {
    const latestChatsMap = new Map<string, Chat>();

    chats.forEach((chat) => {
      const existingChat = latestChatsMap.get(chat.otherUser.id);
      if (
        !existingChat ||
        new Date(chat.createdAt) > new Date(existingChat.createdAt)
      ) {
        latestChatsMap.set(chat.otherUser.id, chat);
      }
    });

    return Array.from(latestChatsMap.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="size-12 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        チャットを使うには
        <Link href="/login" className="text-primary">
          ログイン
        </Link>
        してください
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        {error}
      </div>
    );
  }
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">チャット</h1>
        <CreateGroupChatModal onGroupCreated={fetchGroupChats} />
      </div>

      {/* 個別チャット一覧 */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">個人チャット</h2>
        {chats.length === 0 ? (
          <p className="text-center text-gray-500">
            個人チャットがありません。
          </p>
        ) : (
          <div className="space-y-4">
            {getLatestChats(chats).map((chat) => (
              <Card
                key={chat.otherUser.id}
                className="cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleChatClick(chat.otherUser.id)}
              >
                <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                  <Avatar>
                    <AvatarImage
                      src={chat.otherUser.icon}
                      alt={chat.otherUser.username}
                    />
                    <AvatarFallback>
                      {chat.otherUser.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{chat.otherUser.username}</CardTitle>
                    <CardDescription>@{chat.otherUser.id}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="truncate text-sm text-gray-600 dark:text-gray-300">
                    {chat.message}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(chat.createdAt))}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* グループチャット一覧 */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">グループチャット</h2>
        {groupChats.length === 0 ? (
          <p className="text-center text-gray-500">
            グループチャットがありません。右上のボタンから作成できます。
          </p>
        ) : (
          <div className="space-y-4">
            {groupChats.map((group) => (
              <Card
                key={group.id}
                className="cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => router.push(`/chat/group/${group.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>
                        {group.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{group.name}</CardTitle>
                      <CardDescription>
                        {group.members.length}人のメンバー
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {group.lastMessage ? (
                    <>
                      <p className="truncate text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium">
                          {group.lastMessage.sender.username}:
                        </span>{" "}
                        {group.lastMessage.content}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDistanceToNow(
                          new Date(group.lastMessage.createdAt)
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      まだメッセージがありません
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
