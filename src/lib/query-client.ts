import { QueryClient } from "@tanstack/react-query";

/** キャッシュを即表示し、ユーザー操作で最新化するためのデフォルト設定 */
export const STALE_TIME_MS = 5 * 60 * 1000; // 5分
export const GC_TIME_MS = 30 * 60 * 1000; // 30分

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });
}
