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

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

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

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        読み込み中...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        チャットを使うにはログインしてください
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
      <h1 className="mb-6 text-2xl font-bold">チャット</h1>
      {chats.length === 0 ? (
        <p className="text-center text-gray-500">チャットがありません。</p>
      ) : (
        <div className="space-y-4">
          {chats.map((chat) => (
            <Card
              key={chat.id}
              className="cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => handleChatClick(chat.id)}
            >
              <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                <Avatar>
                  <AvatarImage
                    src={chat.otherUser.icon}
                    alt={chat.otherUser.username}
                  />
                  <AvatarFallback>{chat.otherUser.username[0]}</AvatarFallback>
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
  );
}
