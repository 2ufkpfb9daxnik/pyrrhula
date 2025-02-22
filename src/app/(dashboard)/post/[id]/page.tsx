"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Post } from "@/app/_components/post";
import { MakePost } from "@/app/_components/makepost";
import { toast } from "sonner";
import type { PostDetailResponse } from "@/app/_types/post";

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    fetchPost();
  }, [params.id]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${params.id}`);
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

  const handlePostCreated = () => {
    fetchPost();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
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

  // Post型に変換する関数
  const convertToPost = (postDetail: PostDetailResponse) => ({
    ...postDetail,
    parent: postDetail.parent || undefined,
    _count: {
      replies: postDetail.replies?.length || 0,
    },
  });

  {
    /* 返信投稿フォーム */
  }
  {
    session && (
      <div className="mb-8">
        <Separator className="mb-4" />
        <MakePost
          onPostCreated={handlePostCreated}
          replyTo={{
            id: post.id,
            content: post.content,
            username: post.user.username,
          }}
        />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl p-4">
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
            })}
          />
          <Separator className="my-4" />
        </div>
      )}

      {/* メイン投稿 */}
      <div className="mb-4">
        <Post post={convertToPost(post)} />
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

      {/* 返信投稿フォーム */}
      {session && (
        <div className="mb-8">
          <Separator className="mb-4" />
          <MakePost
            onPostCreated={handlePostCreated}
            replyTo={{
              id: post.id,
              content: post.content,
              username: post.user.username,
            }}
          />
        </div>
      )}

      {/* 返信一覧 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">返信一覧</h2>
        {post.replies && post.replies.length > 0 ? (
          post.replies.map((reply) => (
            <Post
              key={reply.id}
              post={convertToPost({
                ...reply,
                parent: null,
                replies: [],
              })}
            />
          ))
        ) : (
          <p className="text-center text-gray-500">返信はありません</p>
        )}
      </div>
    </div>
  );
}
