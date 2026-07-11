"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Post } from "@/app/_components/post";
import { PostDetail } from "@/app/_components/post-detail";
import { LoaderCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
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
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [siblings, setSiblings] = useState<SiblingPosts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams<{ id: string }>();
  const postId = params?.id ?? "";
  const router = useRouter();

  useEffect(() => {
    if (!postId) return;
    fetchPost();
    fetchSiblings();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`);
      if (!response.ok) {
        throw new Error("投稿の取得に失敗しました");
      }
      const data = await response.json();
      setPost(data);
    } catch (error) {
      console.error("Error fetching post:", error);
      toast.error("投稿の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSiblings = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/siblings`);
      if (!response.ok) {
        throw new Error("前後の投稿の取得に失敗しました");
      }
      const data = await response.json();
      setSiblings(data);
    } catch (error) {
      console.error("Error fetching siblings:", error);
    }
  };

  const handleSiblingNavigation = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  if (isLoading) {
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

  return (
    <div className="mx-auto max-w-2xl p-4">
      {/* ナビゲーションボタン */}
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

      {/* 親投稿 */}
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

      {/* メイン投稿 */}
      <div className="mb-4">
        <PostDetail post={convertToPost(post)} />
      </div>

      {/* 統計情報とリンク */}
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
