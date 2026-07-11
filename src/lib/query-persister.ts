import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export const QUERY_CACHE_STORAGE_KEY = "pyrrhula-query-cache";

export function createQueryPersister() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return createSyncStoragePersister({
    storage: window.localStorage,
    key: QUERY_CACHE_STORAGE_KEY,
  });
}
