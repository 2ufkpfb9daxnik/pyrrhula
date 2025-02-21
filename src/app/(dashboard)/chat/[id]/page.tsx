"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ChatMessage, ChatHistoryResponse } from "@/app/_types/chat";

export default function ChatPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<
    ChatHistoryResponse["otherUser"] | null
  >(null);
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
    fetchMessages();
  }, [session, params.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("ユーザーが見つかりません");

          return;
        }
        throw new Error("Failed to fetch messages");
      }
      const data: ChatHistoryResponse = await response.json();
      setMessages(
        data.messages.map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }))
      );
      setOtherUser(data.otherUser);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("メッセージの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/chat/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("ユーザーが見つかりません");
          return;
        }
        throw new Error("Failed to send message");
      }

      const data: ChatMessage = await response.json();
      setMessages((prev) => [
        {
          ...data,
          createdAt: new Date(data.createdAt),
        },
        ...prev,
      ]);
      setNewMessage("");
      toast.success("メッセージを送信しました");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("メッセージの送信に失敗しました");
    } finally {
      setIsSending(false);
    }
  };

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">
          チャットを表示するにはログインが必要です
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* ヘッダー */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center space-x-4">
          <Avatar className="size-12">
            <AvatarImage src={otherUser?.icon ?? undefined} />
            <AvatarFallback>{otherUser?.username?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-bold">{otherUser?.username}</h1>
            <p className="text-sm text-gray-400">@{otherUser?.id}</p>
          </div>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col-reverse space-y-4 space-y-reverse">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-2 ${
                message.isOwnMessage ? "flex-row-reverse space-x-reverse" : ""
              }`}
            >
              {!message.isOwnMessage && (
                <Avatar className="size-8">
                  <AvatarImage src={otherUser?.icon ?? undefined} />
                  <AvatarFallback>{otherUser?.username?.[0]}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-lg p-3 ${
                  message.isOwnMessage
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-white"
                }`}
              >
                <p className="break-words">{message.message}</p>
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
            placeholder="メッセージを入力..."
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
