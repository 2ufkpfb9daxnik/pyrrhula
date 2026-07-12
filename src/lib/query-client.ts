import { QueryClient } from "@tanstack/react-query";

/** キャッシュを即表示し、バックグラウンドで最新化する */
export const STALE_TIME_MS = 5 * 60 * 1000; // 5分
export const GC_TIME_MS = 24 * 60 * 60 * 1000; // 24時間（IndexedDB 永続化と併用）

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });
}
