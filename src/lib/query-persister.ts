import { get, set, del } from "idb-keyval";
import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";

export const QUERY_CACHE_STORAGE_KEY = "pyrrhula-query-cache";
/** 旧 localStorage キー（移行後に削除） */
const LEGACY_LOCAL_STORAGE_KEY = "pyrrhula-query-cache";

/**
 * IndexedDB へ React Query キャッシュを永続化する。
 * localStorage（~5MB）より容量に余裕があり、ユーザー・投稿が増えても圧迫しにくい。
 */
export function createQueryPersister(): Persister | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  // 旧 localStorage キャッシュはもう使わないので掃除
  try {
    window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  } catch {
    // ignore quota / private mode errors
  }

  return {
    persistClient: async (client: PersistedClient) => {
      await set(QUERY_CACHE_STORAGE_KEY, client);
    },
    restoreClient: async () => {
      return await get<PersistedClient>(QUERY_CACHE_STORAGE_KEY);
    },
    removeClient: async () => {
      await del(QUERY_CACHE_STORAGE_KEY);
    },
  };
}
