"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LoaderCircle, Users } from "lucide-react";

interface GroupMessage {
  id: string;
  content: string;
  createdAt: Date;
  senderId: string;
  sender: {
    username: string;
    icon: string | null;
  };
}

interface GroupChatDetails {
  id: string;
  name: string;
  members: {
    user: {
      id: string;
      username: string;
      icon: string | null;
    };
  }[];
  messages: GroupMessage[];
}

export default function GroupChatPage({ params }: { params: { id: string } }) {
  const [groupChat, setGroupChat] = useState<GroupChatDetails | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!session) return;
    fetchGroupChat();
  }, [session, params.id]);

  useEffect(() => {
    scrollToBottom();
  }, [groupChat?.messages]);

  const fetchGroupChat = async () => {
    try {
      const response = await fetch(`/api/chat/group/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("グループが見つかりません");
          return;
        }
        throw new Error("Failed to fetch group chat");
      }
      const data = await response.json();
      setGroupChat({
        ...data,
        messages: data.messages.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        })),
      });
    } catch (error) {
      console.error("Error fetching group chat:", error);
      toast.error("グループチャットの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/chat/group/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("グループが見つかりません");
          return;
        }
        throw new Error("Failed to send message");
      }

      const message = await response.json();
      setGroupChat((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [
            {
              ...message,
              createdAt: new Date(message.createdAt),
            },
            ...prev.messages,
          ],
        };
      });
      setNewMessage("");
      toast.success("メッセージを送信しました");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("メッセージの送信に失敗しました");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      if (newMessage.trim() && !isSending) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">
          グループチャットを表示するにはログインが必要です
        </p>
      </div>
    );
  }

  if (isLoading || !groupChat) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="size-12 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-screen max-w-4xl flex-col">
      {/* ヘッダー */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="size-12">
              <AvatarFallback>
                {groupChat.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-bold">{groupChat.name}</h1>
              <p className="text-sm text-gray-400">
                {groupChat.members.length}人のメンバー
              </p>
            </div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Users className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>メンバー一覧</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {groupChat.members.map(({ user }) => (
                  <div key={user.id} className="flex items-center space-x-3">
                    <Avatar className="size-8">
                      <AvatarImage src={user.icon ?? undefined} />
                      <AvatarFallback>{user.username[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-gray-500">@{user.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col-reverse space-y-4 space-y-reverse">
          {groupChat.messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-2 ${
                message.senderId === session.user.id
                  ? "flex-row-reverse space-x-reverse"
                  : ""
              }`}
            >
              {message.senderId !== session.user.id && (
                <Avatar className="size-8">
                  <AvatarImage src={message.sender.icon ?? undefined} />
                  <AvatarFallback>{message.sender.username[0]}</AvatarFallback>
                </Avatar>
              )}
              <div>
                {message.senderId !== session.user.id && (
                  <p className="mb-1 text-sm text-gray-400">
                    {message.sender.username}
                  </p>
                )}
                <div
                  className={`rounded-lg p-3 ${
                    message.senderId === session.user.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-white"
                  }`}
                >
                  <p className="break-words">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="border-t border-gray-800 p-4">
        <div className="flex space-x-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ctrl + enter で送信"
            className="min-h-[60px] flex-1 resize-none"
            maxLength={1000}
          />
          <Button type="submit" disabled={isSending || !newMessage.trim()}>
            送信
          </Button>
        </div>
      </form>
    </div>
  );
}
