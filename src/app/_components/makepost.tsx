"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const [newPost, setNewPost] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState("");
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl + Enter で投稿
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      if (newPost.length > 0 && !isLoading) {
        handleSubmit(e as any);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPost,
          parentId: replyTo?.id, // 返信の場合は親投稿のIDを含める
        }),
      });

      if (response.ok) {
        setNewPost("");
        onPostCreated();
      }
    } catch (error) {
      console.error("Error creating post:", error);
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
        ref={inputRef} // inputRef を設定
        placeholder={replyTo ? "返信を入力..." : "今何してる？"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-24 resize-none border-gray-800 bg-transparent"
      />
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          残り {500 - newPost.length} 文字
        </span>
        <Button type="submit" disabled={newPost.length === 0 || isLoading}>
          {isLoading ? "投稿中..." : "投稿"}
        </Button>
      </div>
    </form>
  );
}
