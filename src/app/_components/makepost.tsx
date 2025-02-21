"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MakePostProps {
  onPostCreated: () => void;
}

export function MakePost({ onPostCreated }: MakePostProps) {
  const [newPost, setNewPost] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost }),
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(
        new Event("submit") as unknown as React.FormEvent<HTMLFormElement>
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <Textarea
        value={newPost}
        onChange={(e) => setNewPost(e.target.value)}
        placeholder="ctrl + enter で投稿可"
        onKeyDown={handleKeyDown}
        maxLength={500}
        className="mb-2 w-full"
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
