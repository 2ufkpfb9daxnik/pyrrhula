"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, RefreshCw, MessageCircle, HelpCircle, Link2 } from "lucide-react";
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
import { renderPostContent } from "@/lib/renderPostContent";
import { useRating } from "@/app/_hooks/useRating";
import { formatRatingColorClass } from "@/lib/rating";
import { ImageModal } from "@/app/_components/image-modal";
import { useOptimisticUpdate } from "@/app/_hooks/useOptimisticUpdate";
import type { Post as PostType } from "@/app/_types/post";
import Link from "next/link";
import Image from "next/image";

interface QuestionType {
  id: string;
  question: string;
  answer?: string | null;
  targetUserId: string;
  targetUser: {
    username: string;
    icon: string | null;
  };
}

interface PostProps {
  post: PostType & {
    repostedBy?: {
      id: string;
      username: string;
      icon: string | null;
    };
    repostedAt?: string | Date;
    favoritedAt?: string | Date;
    question?: QuestionType;
  };
  onRepostSuccess?: (newCount: number, isReposted: boolean) => void;
  onFavoriteSuccess?: (newCount: number, isFavorited: boolean) => void;
}

export function Post({ post, onRepostSuccess, onFavoriteSuccess }: PostProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { rating } = useRating(post.user.id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 投稿内容を処理する関数を追加
  const formatPostContent = (content: string): string => {
    // Q: と A: のパターンを検出
    const qAndAPattern = /^Q:([\s\S]+?)(?:\r?\n)+A:([\s\S]+)$/;
    const match = content.match(qAndAPattern);

    // Q:A:形式の場合は、A:の部分のみを返す
    if (match && match[2]) {
      return match[2].trim();
    }

    // それ以外はそのまま返す
    return content;
  };

  const formatDate = (dateValue: string | Date | undefined): Date => {
    if (!dateValue) return new Date();

    if (typeof dateValue === "string") {
      return new Date(dateValue);
    } else if (dateValue instanceof Date) {
      return dateValue;
    }
    return new Date();
  };

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
        : undefined,
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
        : undefined,
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

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("リンクをコピーしました");
    } catch {
      toast.error("リンクのコピーに失敗しました");
    }
  };

  const handlePostClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("button") && !target.closest('[role="button"]')) {
      router.push(`/post/${post.id}`);
    }
  };

  const handleQuestionCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (post.question) {
      router.push(
        `/question/${post.question.targetUserId}/${post.question.id}`,
      );
    }
  };

  return (
    <div
      data-created-at={new Date(post.createdAt).toISOString()}
      className="cursor-pointer border-b px-2 py-1.5 transition-colors hover:bg-[var(--app-post-hover,#0a0a0a)]"
      style={{
        backgroundColor: "var(--app-post-bg, #000000)",
        borderColor: "var(--app-post-border, #262626)",
        color: "var(--app-post-text, #ffffff)",
      }}
      onClick={handlePostClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handlePostClick(e as unknown as React.MouseEvent);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {post.parent && post.parent.user && (
        <div className="mb-1 text-xs" style={{ color: "var(--app-muted-text, #737373)" }}>
          返信先: @{post.parent.user.username}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="h-auto shrink-0 self-start p-0 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            handleUserClick();
          }}
        >
          <Avatar className="size-9">
            <AvatarImage
              src={post.user.icon ?? undefined}
              alt={post.user.username}
            />
            <AvatarFallback>{post.user.username[0]}</AvatarFallback>
          </Avatar>
        </Button>

        <div className="min-w-0 flex-1">
          {post.repostedBy && (
            <div
              className="mb-0.5 flex items-center text-xs leading-none"
              style={{ color: "var(--app-muted-text, #737373)" }}
            >
              <RefreshCw className="mr-1 size-3 shrink-0" />
              <Link
                href={`/user/${post.repostedBy.id}`}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {post.repostedBy.username}さんが拡散しました
              </Link>
            </div>
          )}

          <div
            className="flex flex-wrap items-start gap-x-1.5 gap-y-0"
            style={{ color: "var(--app-muted-text, #737373)" }}
          >
            <Button
              variant="ghost"
              className={`h-auto shrink-0 p-0 text-sm font-bold leading-none hover:underline ${formatRatingColorClass(
                rating?.color ?? "text-gray-300",
              )}`}
              onClick={(e) => {
                e.stopPropagation();
                handleUserClick();
              }}
            >
              {post.user.username}
            </Button>
            <span className="shrink-0 text-xs leading-none">@{post.user.id}</span>
            <span className="shrink-0 text-xs leading-none">·</span>
            <span className="shrink-0 text-xs leading-none">
              {formatDistanceToNow(new Date(post.createdAt))}
            </span>
            {post.repostedAt && !post.repostedBy && (
              <>
                <span className="shrink-0 text-xs leading-none">·</span>
                <span className="shrink-0 text-xs leading-none">
                  {formatDistanceToNow(formatDate(post.repostedAt))}
                  に拡散
                </span>
              </>
            )}
            {post.favoritedAt && (
              <>
                <span className="shrink-0 text-xs leading-none">·</span>
                <span className="shrink-0 text-xs leading-none">
                  {formatDistanceToNow(formatDate(post.favoritedAt))}
                  にお気に入り
                </span>
              </>
            )}
          </div>

          <div className="mt-1.5 min-w-0">
          {/* 投稿本文 - Q:部分を除去して表示 */}
          <div className="whitespace-pre-wrap break-words text-sm leading-snug">
            {renderPostContent(formatPostContent(post.content))}
          </div>

          {post.images && post.images.length > 0 && (
            <div
              className={`mt-1 grid gap-2 ${
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
                  <button
                    type="button"
                    className="block w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(url);
                    }}
                    aria-label={`画像 ${index + 1} を拡大表示`}
                  >
                    <Image
                      src={url}
                      alt={`添付画像 ${index + 1}`}
                      width={1200}
                      height={900}
                      sizes={
                        post.images.length === 1
                          ? "(max-width: 768px) 100vw, 600px"
                          : "(max-width: 768px) 50vw, 300px"
                      }
                      unoptimized
                      loader={({ src: imageSrc }) => imageSrc}
                      className="w-full rounded-lg object-cover"
                      style={{
                        aspectRatio: post.images.length === 1 ? "16/9" : "1/1",
                        maxHeight: post.images.length === 1 ? "400px" : "300px",
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* 質問カード - 回答状態を表示するように改善 */}
          {post.question && (
            <div
              className="mt-2 cursor-pointer rounded-lg border border-blue-600/30 bg-blue-950/20 p-2.5 transition-colors hover:bg-blue-900/20"
              onClick={handleQuestionCardClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleQuestionCardClick(e as unknown as React.MouseEvent);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="質問の詳細を見る"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center text-xs">
                  <HelpCircle className="mr-1.5 size-3.5 text-blue-400" />
                  <span className="font-medium text-blue-400">質問</span>
                </div>
              </div>

              <p className="mb-1.5 text-sm font-medium">
                {post.question.question}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{post.question.targetUser?.username}さんへの質問</span>
              </div>
            </div>
          )}

          <ImageModal
            isOpen={!!selectedImage}
            onClose={() => setSelectedImage(null)}
            src={selectedImage || ""}
            alt="拡大画像"
          />

          <div className="mt-1.5 flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReply}
                  disabled={!session}
                  className="h-6 min-h-0 px-2 py-0 text-xs text-[var(--app-action-icon,#a3a3a3)]"
                >
                  <MessageCircle className="mr-1 size-3.5" />
                  <span>{post._count?.replies ?? 0}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {session ? "返信" : "ログインが必要です"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRepost}
                  disabled={isRepostLoading || !session}
                  className="h-6 min-h-0 px-2 py-0 text-xs text-[var(--app-action-icon,#a3a3a3)]"
                >
                  <RefreshCw
                    className={`mr-1 size-3.5 ${isReposted ? "text-green-500" : ""}`}
                  />
                  <span>{reposts}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {session ? "拡散" : "ログインが必要です"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavorite}
                  disabled={isFavoriteLoading || !session}
                  className="h-6 min-h-0 px-2 py-0 text-xs text-[var(--app-action-icon,#a3a3a3)]"
                >
                  <Star
                    className={`mr-1 size-3.5 ${
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-6 min-h-0 px-2 py-0 text-xs text-[var(--app-action-icon,#a3a3a3)]"
                  aria-label="リンクをコピー"
                >
                  <Link2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>リンクをコピー</TooltipContent>
            </Tooltip>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
