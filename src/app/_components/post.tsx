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
import { linkify } from "@/lib/linkify";
import { useRating } from "@/app/_hooks/useRating";
import { ImageModal } from "@/app/_components/image-modal";
import { useOptimisticUpdate } from "@/app/_hooks/useOptimisticUpdate";
import type { Post as PostType } from "@/app/_types/post";
import Link from "next/link";

interface PostProps {
  post: PostType & {
    repostedBy?: {
      id: string;
      username: string;
      icon: string | null;
    };
    repostedAt?: string | Date;
    favoritedAt?: string | Date;
  };
  onRepostSuccess?: (newCount: number, isReposted: boolean) => void;
  onFavoriteSuccess?: (newCount: number, isFavorited: boolean) => void;
}

export function Post({ post, onRepostSuccess, onFavoriteSuccess }: PostProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { rating } = useRating(post.user.id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 日付をフォーマットするヘルパー関数
  const formatDate = (dateValue: string | Date | undefined): Date => {
    if (!dateValue) return new Date();

    if (typeof dateValue === "string") {
      return new Date(dateValue);
    } else if (dateValue instanceof Date) {
      return dateValue;
    }
    return new Date();
  };

  // 楽観的更新のためのフック
  const {
    count: favorites,
    isActive: isFavorited,
    isLoading: isFavoriteLoading,
    execute: executeFavorite,
  } = useOptimisticUpdate({
    initialCount: post.favorites,
    initialState: post.isFavorited || false,
    successMessage: {
      add: "お気に入りに追加しました",
      remove: "お気に入りを解除しました",
    },
    errorMessage: "お気に入りの処理に失敗しました",
  });

  const {
    count: reposts,
    isActive: isReposted,
    isLoading: isRepostLoading,
    execute: executeRepost,
  } = useOptimisticUpdate({
    initialCount: post.reposts,
    initialState: post.isReposted || false,
    successMessage: {
      add: "投稿を拡散しました",
      remove: "拡散を取り消しました",
    },
    errorMessage: "拡散の処理に失敗しました",
  });

  // イベントハンドラー
  const handleUserClick = () => {
    router.push(`/user/${post.user.id}`);
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      toast.error("ログインが必要です");
      return;
    }

    executeFavorite(
      () =>
        fetch(`/api/posts/${post.id}/favorite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      onFavoriteSuccess
        ? async () => {
            onFavoriteSuccess(favorites + (isFavorited ? -1 : 1), !isFavorited);
          }
        : undefined
    );
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      toast.error("ログインが必要です");
      return;
    }

    executeRepost(
      () =>
        fetch(`/api/posts/${post.id}/repost`, {
          method: isReposted ? "DELETE" : "POST",
        }),
      onRepostSuccess
        ? async () => {
            onRepostSuccess(reposts + (isReposted ? -1 : 1), !isReposted);
          }
        : undefined
    );
  };

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      toast.error("ログインが必要です");
      return;
    }
    router.push(`/post/${post.id}`);
  };

  const handlePostClick = (e: React.MouseEvent) => {
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
      {/* 拡散表示 */}
      {post.repostedBy && (
        <div className="mb-2 flex items-center text-sm text-gray-500">
          <RefreshCw className="mr-2 size-3.5" />
          <Link
            href={`/user/${post.repostedBy.id}`}
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {post.repostedBy.username}さんが拡散しました
          </Link>
        </div>
      )}

      {/* 親投稿への返信表示 */}
      {post.parent && post.parent.user && (
        <div className="mb-2 text-sm text-gray-500">
          返信先: @{post.parent.user.username}
        </div>
      )}

      <div className="flex flex-col space-y-3">
        {/* ユーザー情報 */}
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

          <div className="flex flex-col">
            <Button
              variant="ghost"
              className={`h-auto w-full justify-start p-0 text-base font-bold hover:underline ${
                rating?.color ?? "text-gray-300"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleUserClick();
              }}
            >
              {post.user.username}
            </Button>

            {/* 投稿メタ情報 */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-500">@{post.user.id}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500">
                {formatDistanceToNow(new Date(post.createdAt))}
              </span>
              {post.repostedAt && !post.repostedBy && (
                <>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-500">
                    {formatDistanceToNow(formatDate(post.repostedAt))}
                    に拡散
                  </span>
                </>
              )}
              {post.favoritedAt && (
                <>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-500">
                    {formatDistanceToNow(formatDate(post.favoritedAt))}
                    にお気に入り
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 投稿本文 */}
        <p className="whitespace-pre-wrap break-words">
          {linkify(post.content)}
        </p>

        {/* 画像表示 */}
        {post.images && post.images.length > 0 && (
          <div
            className={`mt-2 grid gap-2 ${
              post.images.length === 1
                ? "grid-cols-1"
                : post.images.length === 2
                  ? "grid-cols-2"
                  : post.images.length === 3
                    ? "grid-cols-2"
                    : "grid-cols-2"
            }`}
          >
            {post.images.map((url, index) => (
              <div
                key={index}
                className={`relative ${
                  post.images.length === 3 && index === 0 ? "col-span-2" : ""
                }`}
              >
                <img
                  src={url}
                  alt={`添付画像 ${index + 1}`}
                  className="w-full rounded-lg object-cover"
                  style={{
                    aspectRatio: post.images.length === 1 ? "16/9" : "1/1",
                    maxHeight: post.images.length === 1 ? "400px" : "300px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(url);
                  }}
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-image.png";
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* 画像モーダル */}
        <ImageModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          src={selectedImage || ""}
          alt="拡大画像"
        />

        {/* アクションボタン */}
        <div className="mt-3 flex items-center space-x-6">
          {/* 返信ボタン */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReply}
                disabled={!session}
              >
                <MessageCircle className="mr-1 size-4" />
                <span>{post._count?.replies ?? 0}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {session ? "返信" : "ログインが必要です"}
            </TooltipContent>
          </Tooltip>

          {/* 拡散ボタン */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRepost}
                disabled={isRepostLoading || !session}
              >
                <RefreshCw
                  className={`mr-1 size-4 ${isReposted ? "text-green-500" : ""}`}
                />
                <span>{reposts}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {session ? "拡散" : "ログインが必要です"}
            </TooltipContent>
          </Tooltip>

          {/* お気に入りボタン */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavorite}
                disabled={isFavoriteLoading || !session}
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
  );
}
