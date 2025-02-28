"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ChatMessage, ChatHistoryResponse } from "@/app/_types/chat";
import { Link, LoaderCircle } from "lucide-react";

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
  const optimisticMessageId = useRef<string | null>(null);

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
    const tempId = `temp-${Date.now()}`;
    optimisticMessageId.current = tempId;

    // 楽観的更新
    const optimisticMessage: ChatMessage = {
      id: tempId,
      message: newMessage,
      createdAt: new Date(),
      isOwnMessage: true,
      senderId: session?.user?.id || "",
    };

    setMessages((prev) => [optimisticMessage, ...prev]);
    setNewMessage("");

    try {
      const response = await fetch(`/api/chat/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("ユーザーが見つかりません");
          // 楽観的更新を元に戻す
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
          return;
        }
        throw new Error("Failed to send message");
      }

      const data: ChatMessage = await response.json();
      // 一時的なメッセージを実際のメッセージに置き換え
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? { ...data, createdAt: new Date(data.createdAt) }
            : msg
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("メッセージの送信に失敗しました");
      // エラー時は楽観的更新を元に戻す
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setNewMessage(optimisticMessage.message); // 入力内容を復元
    } finally {
      setIsSending(false);
      optimisticMessageId.current = null;
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
          チャットを表示するには
          <Link href="/login" className="text-primary">
            ログイン
          </Link>
          が必要です
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="size-12 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-screen max-w-4xl flex-col">
      {/* ヘッダー - 固定位置 */}
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-black p-4">
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
      <div className="flex-1 overflow-y-auto p-4 pb-[120px]">
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
                    ? message.id === optimisticMessageId.current
                      ? "bg-blue-600/50 text-white" // 送信中のメッセージは半透明
                      : "bg-blue-600 text-white"
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

      {/* 入力フォーム - 固定位置 */}
      <form
        onSubmit={handleSubmit}
        className="fixed inset-x-0 bottom-16 border-t border-gray-800 bg-black p-4"
      >
        <div className="mx-auto flex max-w-4xl space-x-2">
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
