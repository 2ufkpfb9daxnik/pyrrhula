"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// メンションを抽出する正規表現
const MENTION_PATTERN = /@[\w]+/g;

interface MakePostProps {
  onPostCreated: () => void;
  replyTo?: {
    id: string;
    content: string;
    username: string;
  } | null;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

export function MakePost({ onPostCreated, replyTo, inputRef }: MakePostProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // メンションされたユーザーの通知を作成
  const createMentionNotifications = async (
    postId: string,
    content: string
  ) => {
    const mentions = content.match(MENTION_PATTERN);
    if (!mentions) return;

    // 重複を削除 - スプレッド構文を Array.from() に変更
    const uniqueMentions = Array.from(new Set(mentions));

    for (const mention of uniqueMentions) {
      const username = mention.slice(1); // @を除去
      try {
        const response = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "mention",
            postId,
            username,
          }),
        });

        if (!response.ok) {
          console.error(`Failed to create notification for ${username}`);
        }
      } catch (error) {
        console.error("Error creating mention notification:", error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl + Enter で投稿
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      if (content.length > 0 && !isLoading) {
        handleSubmit(e as any);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (content.trim().length === 0) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          parentId: replyTo?.id,
        }),
      });

      if (response.ok) {
        const post = await response.json();
        // メンション通知を作成
        await createMentionNotifications(post.id, content);
        setContent("");
        onPostCreated();
      }
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("投稿に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      {replyTo && (
        <div className="mb-2 text-sm text-gray-500">
          返信: @{replyTo.username} {replyTo.content.substring(0, 30)}
          {replyTo.content.length > 30 && "..."}
        </div>
      )}
      <Textarea
        ref={inputRef}
        placeholder={replyTo ? "返信を入力..." : "今何してる？"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-24 resize-none border-gray-800 bg-transparent"
      />
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          残り {500 - content.length} 文字
        </span>
        <Button
          type="submit"
          disabled={content.trim().length === 0 || isLoading}
        >
          {isLoading ? "投稿中..." : "投稿"}
        </Button>
      </div>
    </form>
  );
}
