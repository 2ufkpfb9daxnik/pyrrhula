import { QueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { TimelinePageResponse } from "@/lib/api/timeline";
import { syncNotificationsInBackground } from "@/lib/sync-notifications";
import { STALE_TIME_MS } from "@/lib/query-client";

async function fetchTimelinePage(
  endpoint: string,
  extraParams: Record<string, string> = {},
): Promise<TimelinePageResponse> {
  const params = new URLSearchParams({
    limit: "10",
    includeReposts: "true",
    ...extraParams,
  });
  return fetchJson<TimelinePageResponse>(`${endpoint}?${params}`);
}

export function prefetchTimelineTabs(queryClient: QueryClient) {
  syncNotificationsInBackground(queryClient);

  void queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.wholeTimeline(),
    queryFn: () => fetchTimelinePage("/api/whole"),
    initialPageParam: undefined as string | undefined,
    staleTime: STALE_TIME_MS,
  });

  void queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.homeTimeline(),
    queryFn: () =>
      fetchTimelinePage("/api/posts", { includeRepostedByUser: "true" }),
    initialPageParam: undefined as string | undefined,
    staleTime: STALE_TIME_MS,
  });
}
