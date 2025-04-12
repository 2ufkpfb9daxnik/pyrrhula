"use client";

import { type Post as PostType } from "@/app/_types/post";
import { Post } from "@/app/_components/post";

interface PostListProps {
  posts: (PostType & {
    repostedBy?: {
      id: string;
      username: string;
      icon: string | null;
    };
    repostedAt?: string | Date;
    favoritedAt?: string | Date;
    question?: {
      id: string;
      question: string;
      answer?: string | null;
      targetUserId: string;
      targetUser: {
        username: string;
        icon: string | null;
      };
    };
  })[];
  onRepostSuccess?: (
    postId: string,
    newCount: number,
    isReposted: boolean
  ) => void;
  onFavoriteSuccess?: (
    postId: string,
    newCount: number,
    isFavorited: boolean
  ) => void;
}

export function PostList({
  posts,
  onRepostSuccess,
  onFavoriteSuccess,
}: PostListProps) {
  return (
    <div className="divide-y divide-gray-700">
      {posts.map((post) => (
        <Post
          key={post.id}
          post={post}
          onRepostSuccess={
            onRepostSuccess
              ? (newCount, isReposted) =>
                  onRepostSuccess(post.id, newCount, isReposted)
              : undefined
          }
          onFavoriteSuccess={
            onFavoriteSuccess
              ? (newCount, isFavorited) =>
                  onFavoriteSuccess(post.id, newCount, isFavorited)
              : undefined
          }
        />
      ))}
    </div>
  );
}
