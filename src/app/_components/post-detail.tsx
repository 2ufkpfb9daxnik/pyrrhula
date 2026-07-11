"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, RefreshCw, HelpCircle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { format } from "date-fns";
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

interface PostDetailProps {
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

function formatPostContent(content: string): string {
  const qAndAPattern = /^Q:([\s\S]+?)(?:\r?\n)+A:([\s\S]+)$/;
  const match = content.match(qAndAPattern);
  if (match && match[2]) {
    return match[2].trim();
  }
  return content;
}

export function PostDetail({
  post,
  onRepostSuccess,
  onFavoriteSuccess,
}: PostDetailProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { rating } = useRating(post.user.id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  const handleFavorite = async () => {
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

  const handleRepost = async () => {
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

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("リンクをコピーしました");
    } catch {
      toast.error("リンクのコピーに失敗しました");
    }
  };

  const handleQuestionCardClick = () => {
    if (post.question) {
      router.push(
        `/question/${post.question.targetUserId}/${post.question.id}`,
      );
    }
  };

  return (
    <article
      className="rounded-lg border px-3 py-3"
      style={{
        backgroundColor: "var(--app-post-bg, #000000)",
        borderColor: "var(--app-post-border, #262626)",
        color: "var(--app-post-text, #ffffff)",
      }}
    >
      {post.parent && post.parent.user && (
        <div
          className="mb-2 text-sm"
          style={{ color: "var(--app-muted-text, #737373)" }}
        >
          返信先: @{post.parent.user.username}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="ghost"
          className="h-auto shrink-0 self-start p-0 hover:bg-transparent"
          onClick={handleUserClick}
        >
          <Avatar className="size-12">
            <AvatarImage
              src={post.user.icon ?? undefined}
              alt={post.user.username}
            />
            <AvatarFallback>{post.user.username[0]}</AvatarFallback>
          </Avatar>
        </Button>

        <div className="min-w-0 flex-1 pt-0.5">
          <Button
            variant="ghost"
            className={`h-auto p-0 text-base font-bold leading-tight hover:underline ${formatRatingColorClass(
              rating?.color ?? "text-gray-300",
            )}`}
            onClick={handleUserClick}
          >
            {post.user.username}
          </Button>
          <p
            className="mt-0.5 text-sm leading-tight"
            style={{ color: "var(--app-muted-text, #737373)" }}
          >
            @{post.user.id}
          </p>
        </div>
      </div>

      <div className="mt-3 min-w-0">
        <div className="whitespace-pre-wrap break-words text-sm leading-snug">
          {renderPostContent(formatPostContent(post.content))}
        </div>

        {post.images && post.images.length > 0 && (
          <div
            className={`mt-2 grid gap-2 ${
              post.images.length === 1
                ? "grid-cols-1"
                : post.images.length === 2
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
                  onClick={() => setSelectedImage(url)}
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

        {post.question && (
          <div
            className="mt-2 cursor-pointer rounded-lg border border-blue-600/30 bg-blue-950/20 p-2.5 transition-colors hover:bg-blue-900/20"
            onClick={handleQuestionCardClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleQuestionCardClick();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="質問の詳細を見る"
          >
            <div className="mb-1.5 flex items-center text-xs">
              <HelpCircle className="mr-1.5 size-3.5 text-blue-400" />
              <span className="font-medium text-blue-400">質問</span>
            </div>
            <p className="mb-1.5 text-sm font-medium">
              {post.question.question}
            </p>
            <div className="text-xs text-gray-400">
              {post.question.targetUser?.username}さんへの質問
            </div>
          </div>
        )}
      </div>

      <p
        className="mt-2 text-sm"
        style={{ color: "var(--app-muted-text, #737373)" }}
      >
        {formatDistanceToNow(new Date(post.createdAt))}
        {" · "}
        {format(new Date(post.createdAt), "yyyy年M月d日 H時m分s秒")}
      </p>

      <ImageModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        src={selectedImage || ""}
        alt="拡大画像"
      />

      <div className="mt-1.5 flex items-center gap-3">
        <span
          className="inline-flex h-6 min-h-0 shrink-0 items-center px-2 py-0 text-xs invisible pointer-events-none"
          aria-hidden="true"
        >
          <span className="mr-1 inline-block size-3.5 shrink-0" />
          <span>0</span>
        </span>

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
    </article>
  );
}
