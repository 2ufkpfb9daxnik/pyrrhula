"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Post } from "@/app/_components/post";
import { MakePost } from "@/app/_components/makepost";
import { Search } from "@/app/_components/search";
import { Navigation } from "@/app/_components/navigation";

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
  _count: {
    replies: number;
  };
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/posts");
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      const data = await response.json();
      setPosts(
        data.posts.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt),
        }))
      );
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const handleSearch = async (query: string) => {
    try {
      const response = await fetch(
        `/api/posts/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error("Failed to search posts");
      }
      const data = await response.json();
      setPosts(
        data.posts.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt),
        }))
      );
    } catch (error) {
      console.error("Error searching posts:", error);
    }
  };

  return (
    <>
      {/* 左サイドバー */}
      <div className="fixed left-16 top-0 flex h-full w-80 flex-col gap-4 border-r border-gray-800 p-4">
        <MakePost onPostCreated={fetchPosts} />
        <Search onSearch={handleSearch} />
      </div>
      {/* メインコンテンツ */}
      <main className="flex-1">
        <div
          className="mx-auto max-w-2xl p-4"
          style={{ marginLeft: "calc(50% - 21rem)" }}
        >
          <div className="space-y-4">
            {posts.map((post) => (
              <Post key={post.id} post={post} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
