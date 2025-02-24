"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X } from "lucide-react";

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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;

    // 画像URLの簡易バリデーション
    try {
      new URL(newImageUrl);
    } catch {
      toast.error("有効なURLを入力してください");
      return;
    }

    if (imageUrls.length >= 4) {
      toast.error("画像は4枚までしか追加できません");
      return;
    }

    setImageUrls([...imageUrls, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

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
          images: imageUrls,
        }),
      });

      if (response.ok) {
        const post = await response.json();
        // メンション通知を作成
        await createMentionNotifications(post.id, content);
        setContent("");
        setImageUrls([]);
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
        placeholder={replyTo ? "返信内容を入力" : "投稿内容を入力"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-24 resize-none border-gray-800 bg-transparent"
      />
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          残り {500 - content.length} 文字
        </span>

        {/* 画像URL入力部分 */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="画像URL4枚まで"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddImage}
              disabled={imageUrls.length >= 4}
            >
              追加
            </Button>
          </div>

          {/* 追加された画像URLのプレビュー */}
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {imageUrls.map((url, index) => (
                <div key={index} className="group relative">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="h-40 w-full rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-image.png";
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 投稿ボタン */}
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
