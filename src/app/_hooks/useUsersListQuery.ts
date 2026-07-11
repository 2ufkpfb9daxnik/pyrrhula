"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

interface ApiUser {
  id: string;
  username: string;
  icon: string | null;
  rate: number;
  postCount: number;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  isFollowing?: boolean;
  isFollower?: boolean;
  ratingColor?: string;
}

interface UsersListResponse {
  users: ApiUser[];
  pagination?: {
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

export interface UsersListItem {
  id: string;
  username: string;
  icon: string | null;
  rate: number;
  postCount: number;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  isFollowing: boolean;
  isFollower: boolean;
  ratingColor: string;
}

export function useUsersList(
  sortBy: "rate" | "createdAt",
  page: number,
  includeFollowStatus: boolean,
) {
  return useQuery({
    queryKey: queryKeys.usersList(sortBy, page),
    queryFn: async () => {
      const params = new URLSearchParams({
        sort: sortBy,
        page: String(page),
        limit: "5",
        includeFollowStatus: includeFollowStatus ? "true" : "false",
      });
      const data = await fetchJson<UsersListResponse>(`/api/users?${params}`);
      const users: UsersListItem[] = data.users.map((user) => ({
        id: user.id,
        username: user.username,
        icon: user.icon,
        rate: user.rate,
        postCount: user.postCount,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        createdAt: user.createdAt,
        isFollowing: user.isFollowing ?? false,
        isFollower: user.isFollower ?? false,
        ratingColor: user.ratingColor ?? "",
      }));
      return {
        users,
        pagination: {
          total: data.pagination?.total ?? 0,
          pages:
            data.pagination?.pages ??
            Math.ceil((data.pagination?.total ?? 0) / 5),
          currentPage: page,
          hasMore: data.pagination?.hasMore ?? false,
        },
      };
    },
    placeholderData: keepPreviousData,
  });
}
