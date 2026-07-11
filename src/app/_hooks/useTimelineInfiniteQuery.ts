"use client";

import { useMemo, useCallback } from "react";
import {
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import type { TimelinePageResponse } from "@/lib/api/timeline";
import { formatApiPost, filterTimelinePosts } from "@/lib/format-post";
import { STALE_TIME_MS, GC_TIME_MS } from "@/lib/query-client";

interface UseTimelineInfiniteQueryOptions {
  queryKey: readonly unknown[];
  endpoint: string;
  extraParams?: Record<string, string>;
  enabled?: boolean;
  initialData?: InfiniteData<TimelinePageResponse, string | undefined>;
}

export function useTimelineInfiniteQuery({
  queryKey,
  endpoint,
  extraParams = {},
  enabled = true,
  initialData,
}: UseTimelineInfiniteQueryOptions) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: "10",
        includeReposts: "true",
        ...extraParams,
      });
      if (pageParam) params.set("cursor", pageParam);

      return fetchJson<TimelinePageResponse>(`${endpoint}?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled,
    initialData,
  });

  const posts = useMemo(() => {
    if (!query.data) return [];
    const raw = query.data.pages.flatMap((page) => page.posts);
    return filterTimelinePosts(raw.map(formatApiPost));
  }, [query.data]);

  const refresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const showStaleBanner = query.isStale && posts.length > 0;

  return {
    ...query,
    posts,
    refresh,
    showStaleBanner,
    hasCachedData: posts.length > 0,
  };
}
