"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, RefreshCw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { useSession } from "next-auth/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { linkify } from "@/lib/linkify";
import { useRating } from "@/app/_hooks/useRating";

interface Post {
  id: string;
  content: string;
  createdAt: Date;
  favorites: number;
  reposts: number;
  user: {
    id: string;
    username: string;
    icon: string | null;
  };
  parent?: {
    id: string;
    content: string;
    user?: {
      id: string;
      username: string;
    };
  };
  _count?: {
    replies: number;
  };
  isFavorited?: boolean;
  isReposted?: boolean;
}

interface PostProps {
  post: Post;
  onRepostSuccess?: () => Promise<void>;
  onFavoriteSuccess?: () => Promise<void>;
}

export function Post({ post, onRepostSuccess, onFavoriteSuccess }: PostProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [favorites, setFavorites] = useState(post.favorites);
  const [reposts, setReposts] = useState(post.reposts);
  const [isFavorited, setIsFavorited] = useState(post.isFavorited);
  const [isReposted, setIsReposted] = useState(post.isReposted);
  const [isLoading, setIsLoading] = useState(false);
  const { rating } = useRating(post.user.id);

  const handleUserClick = () => {
    router.push(`/user/${post.user.id}`);
  };
  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session || isLoading) return;

    try {
      setIsLoading(true);

      const response = await fetch(`/api/posts/${post.id}/favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("お気に入りエラーレスポンス:", error);
        throw new Error(error.message || "お気に入りに失敗しました");
      }

      const data = await response.json();
      console.log("お気に入り成功:", data);

      // ローカルの状態を更新
      setIsFavorited((prev) => !prev);
      setFavorites((prev) => (isFavorited ? prev - 1 : prev + 1));

      if (onFavoriteSuccess) {
        onFavoriteSuccess();
      }

      toast.success(
        isFavorited ? "お気に入りを解除しました" : "お気に入りに追加しました"
      );
    } catch (error) {
      console.error("お気に入り処理エラー:", error);
      toast.error("お気に入りの処理に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };
  const handleRepost = async () => {
    if (!session) {
      toast.error("ログインが必要です");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/repost`, {
        method: isReposted ? "DELETE" : "POST",
      });

      if (!response.ok) throw new Error("Failed to repost");

      setReposts((prev) => (isReposted ? prev - 1 : prev + 1));
      setIsReposted((prev) => !prev);

      if (onRepostSuccess) {
        await onRepostSuccess();
      }
    } catch (error) {
      toast.error("操作に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = () => {
    if (!session) {
      toast.error("ログインが必要です");
      return;
    }
    router.push(`/compose/reply/${post.id}`);
  };

  const handlePostClick = (e: React.MouseEvent) => {
    // ボタンやアバター以外の領域がクリックされた場合
    const target = e.target as HTMLElement;
    if (!target.closest("button") && !target.closest('[role="button"]')) {
      router.push(`/post/${post.id}`);
    }
  };

  return (
    <div
      className="cursor-pointer border-b border-gray-700 p-4 transition-colors hover:bg-gray-900/50"
      onClick={handlePostClick}
    >
      {post.parent &&
        post.parent.user && ( // userの存在確認を追加
          <div className="mb-2 text-sm text-gray-500">
            返信先: @{post.parent.user.username}
          </div>
        )}
      <div className="flex items-start space-x-3">
        <Button
          variant="ghost"
          className="p-0 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            handleUserClick();
          }}
        >
          <Avatar>
            <AvatarImage
              src={post.user.icon ?? undefined}
              alt={post.user.username}
            />
            <AvatarFallback>{post.user.username[0]}</AvatarFallback>
          </Avatar>
        </Button>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              className={`h-auto p-0 font-bold hover:underline ${rating?.color ?? "text-gray-300"}`}
              onClick={handleUserClick}
            >
              {post.user.username}
            </Button>
            <span className="text-gray-500">@{post.user.id}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">
              {formatDistanceToNow(new Date(post.createdAt))}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words">
            {linkify(post.content)}
          </p>
          <div className="mt-3 flex items-center space-x-6">
            {/* リプライボタン */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReply();
                  }}
                  disabled={isLoading || !session}
                >
                  <MessageCircle className="mr-1 size-4" />
                  <span>{post._count?.replies ?? 0}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {session ? "返信" : "ログインが必要です"}
              </TooltipContent>
            </Tooltip>

            {/* リポストボタン */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRepost}
                  disabled={isLoading || !session}
                >
                  <RefreshCw
                    className={`mr-1 size-4 ${
                      isReposted ? "text-green-500" : ""
                    }`}
                  />
                  <span>{reposts}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {session ? "リポスト" : "ログインが必要です"}
              </TooltipContent>
            </Tooltip>

            {/* お気に入りボタン */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavorite}
                  disabled={isLoading || !session}
                >
                  <Star
                    className={`mr-1 size-4 ${
                      isFavorited ? "fill-yellow-500 text-yellow-500" : ""
                    }`}
                  />
                  <span>{favorites}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {session ? "お気に入り" : "ログインが必要です"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
