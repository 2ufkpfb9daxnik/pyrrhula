"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Post } from "@/app/_components/post";
import { PostDetail } from "@/app/_components/post-detail";
import { LoaderCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { STALE_TIME_MS } from "@/lib/query-client";
import { findCachedPostForDetail } from "@/lib/post-detail-cache";
import type { PostDetailResponse } from "@/app/_types/post";

interface SiblingPosts {
  previousPost: {
    id: string;
    content: string;
    createdAt: string;
  } | null;
  nextPost: {
    id: string;
    content: string;
    createdAt: string;
  } | null;
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = params?.id ?? "";
  const router = useRouter();
  const queryClient = useQueryClient();

  const cachedSeed =
    postId.length > 0
      ? findCachedPostForDetail(queryClient, postId)
      : undefined;

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.postDetail(postId),
    queryFn: () => fetchJson<PostDetailResponse>(`/api/posts/${postId}`),
    enabled: !!postId,
    staleTime: STALE_TIME_MS,
    refetchOnMount: true,
    initialData: cachedSeed,
    initialDataUpdatedAt: cachedSeed ? Date.now() - STALE_TIME_MS - 1 : undefined,
  });

  const { data: siblings } = useQuery({
    queryKey: queryKeys.postSiblings(postId),
    queryFn: () => fetchJson<SiblingPosts>(`/api/posts/${postId}/siblings`),
    enabled: !!postId,
    staleTime: STALE_TIME_MS,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (isError && !post) {
      toast.error("投稿の取得に失敗しました");
    }
  }, [isError, post]);

  if (isLoading && !post) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="size-12 animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">投稿が見つかりません</p>
      </div>
    );
  }

  const convertToPost = (postDetail: PostDetailResponse) => ({
    ...postDetail,
    images: postDetail.images || [],
    parent: postDetail.parent || undefined,
    _count: {
      replies: postDetail.replies?.length || 0,
    },
  });

  const handleSiblingNavigation = (id: string) => {
    router.push(`/post/${id}`);
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-sm"
          onClick={() =>
            siblings?.previousPost &&
            handleSiblingNavigation(siblings.previousPost.id)
          }
          disabled={!siblings?.previousPost}
        >
          <ArrowLeft className="mr-2 size-4" />
          前の投稿
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-sm"
          onClick={() =>
            siblings?.nextPost && handleSiblingNavigation(siblings.nextPost.id)
          }
          disabled={!siblings?.nextPost}
        >
          次の投稿
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>

      {post.parent && (
        <div className="mb-4">
          <Post
            post={convertToPost({
              ...post.parent,
              replies: [],
              createdAt: new Date(),
              favorites: 0,
              reposts: 0,
              parent: null,
              images: post.parent.images || [],
              _count: {
                replies: 0,
              },
            })}
          />
          <Separator className="my-4" />
        </div>
      )}

      <div className="mb-4">
        <PostDetail post={convertToPost(post)} />
      </div>

      <div className="mb-8 flex items-center justify-around rounded-lg border border-gray-800 p-4">
        <Button
          variant="ghost"
          className="flex flex-col items-center space-y-1"
          onClick={() => router.push(`/post/${post.id}/repost`)}
        >
          <span className="text-lg font-bold">{post.reposts}</span>
          <span className="text-sm text-gray-500">拡散した人</span>
        </Button>
        <Separator orientation="vertical" className="h-12" />
        <Button
          variant="ghost"
          className="flex flex-col items-center space-y-1"
          onClick={() => router.push(`/post/${post.id}/favorite`)}
        >
          <span className="text-lg font-bold">{post.favorites}</span>
          <span className="text-sm text-gray-500">お気に入りした人</span>
        </Button>
      </div>
    </div>
  );
}
