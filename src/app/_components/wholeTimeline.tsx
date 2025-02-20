"use client";

import { useState, useEffect } from "react";
import { Post } from "./post";
import { Search } from "./search";

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

export function WholeTimeline() {
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
    <div className="h-full overflow-y-auto">
      {/* 検索バー */}
      <div className="sticky top-0 bg-background p-4 border-b border-gray-800">
        <Search onSearch={handleSearch} />
      </div>

      {/* タイムライン */}
      <div className="p-4">
        <div className="space-y-4">
          {posts.map((post) => (
            <Post key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}