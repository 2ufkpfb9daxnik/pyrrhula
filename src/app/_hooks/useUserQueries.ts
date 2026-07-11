"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson, ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { formatApiPost } from "@/lib/format-post";
import type { Post } from "@/app/_types/post";
import type { ApiPostRaw } from "@/lib/api/timeline";

export interface UserDetail {
  id: string;
  username: string;
  icon: string | null;
  profile: string | null;
  postCount: number;
  rate: number;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

export interface RatingHistoryEntry {
  delta: number;
  rating: number;
  createdAt: string;
  reason?: string;
}

type UserContentType = "posts" | "reposts" | "favorites" | "replies";

interface UserContentResponse {
  posts?: ApiPostRaw[];
  reposts?: ApiPostRaw[];
  replies?: ApiPostRaw[];
  hasMore?: boolean;
  nextCursor?: string | null;
}

function formatUserContent(
  type: UserContentType,
  data: UserContentResponse,
): Post[] {
  switch (type) {
    case "reposts":
      return (data.reposts ?? []).map((post) =>
        formatApiPost({
          ...post,
          createdAt:
            typeof post.createdAt === "string"
              ? post.createdAt
              : new Date(post.createdAt).toISOString(),
          repostedAt: post.repostedAt,
        }),
      );
    case "favorites":
      return (data.posts ?? []).map((post) => formatApiPost(post));
    case "replies":
      return (data.replies ?? []).map((post) => formatApiPost(post));
    default:
      return (data.posts ?? []).map((post) => formatApiPost(post));
  }
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => fetchJson<UserDetail>(`/api/users/${userId}`),
    enabled: !!userId,
  });
}

export function useUserRatingHistory(userId: string) {
  return useQuery({
    queryKey: queryKeys.userRatingHistory(userId),
    queryFn: async () => {
      const data = await fetchJson<{ ratingHistory: RatingHistoryEntry[] }>(
        `/api/users/${userId}/rating/history`,
      );
      return data.ratingHistory;
    },
    enabled: !!userId,
  });
}

export function useUserContent(
  userId: string,
  type: UserContentType,
  cursor?: string | null,
) {
  return useQuery({
    queryKey: [...queryKeys.userContent(userId, type), cursor ?? "initial"],
    queryFn: async () => {
      let endpoint = `/api/users/${userId}`;
      switch (type) {
        case "posts":
          endpoint = `/api/users/${userId}?type=posts${cursor ? `&cursor=${cursor}` : ""}`;
          break;
        case "reposts":
          endpoint = `/api/users/${userId}/repost${cursor ? `?cursor=${cursor}&limit=10` : "?limit=10"}`;
          break;
        case "favorites":
          endpoint = `/api/users/${userId}/favorite${cursor ? `?cursor=${cursor}&limit=10` : "?limit=10"}`;
          break;
        case "replies":
          endpoint = `/api/users/${userId}/reply${cursor ? `?cursor=${cursor}&limit=10` : "?limit=10"}`;
          break;
      }

      try {
        const data = await fetchJson<UserContentResponse>(endpoint);
        return {
          posts: formatUserContent(type, data),
          hasMore: data.hasMore ?? false,
          nextCursor: data.nextCursor ?? null,
        };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return { posts: [], hasMore: false, nextCursor: null };
        }
        throw error;
      }
    },
    enabled: !!userId,
  });
}

export function usePrefetchUserTabs(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  const prefetchProfile = () => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.user(userId),
      queryFn: () => fetchJson<UserDetail>(`/api/users/${userId}`),
    });
  };

  const prefetchUsersList = (sort = "rate", page = 1) => {
    const params = new URLSearchParams({
      sort,
      page: String(page),
      limit: "5",
      includeFollowStatus: "true",
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.usersList(sort, page),
      queryFn: () => fetchJson(`/api/users?${params}`),
    });
  };

  return { prefetchProfile, prefetchUsersList };
}
