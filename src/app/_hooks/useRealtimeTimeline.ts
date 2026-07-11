"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { isRealtimeConfigured } from "@/lib/realtime-config";
import {
  subscribeToPostInserts,
  subscribeToRepostInserts,
} from "@/lib/realtime-manager";

/** 連続 INSERT をまとめて1回の更新にする（無料枠・API負荷軽減） */
const DEBOUNCE_MS = 800;

interface UseRealtimeTimelineOptions {
  channelName: string;
  includeReposts?: boolean;
  /** true: 新着を自動でタイムラインに反映（推奨・デフォルト） */
  autoUpdate?: boolean;
  onAutoUpdate?: () => void;
}

/**
 * Supabase Realtime で Post / Repost の INSERT を購読する。
 * 接続はアプリ全体で1本だけ共有する（WebSocket の作り直しを防ぐ）。
 */
export function useRealtimeTimeline({
  includeReposts = false,
  autoUpdate = true,
  onAutoUpdate,
}: UseRealtimeTimelineOptions) {
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "idle" | "connected" | "error"
  >("idle");

  const autoUpdateRef = useRef(autoUpdate);
  const onAutoUpdateRef = useRef(onAutoUpdate);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    autoUpdateRef.current = autoUpdate;
    onAutoUpdateRef.current = onAutoUpdate;
  });

  useEffect(() => {
    if (!isRealtimeConfigured()) {
      return;
    }

    setConnectionState("connected");

    const scheduleUpdate = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (autoUpdateRef.current && onAutoUpdateRef.current) {
          onAutoUpdateRef.current();
        } else {
          setHasNewPosts(true);
        }
      }, DEBOUNCE_MS);
    };

    const unsubPost = subscribeToPostInserts(scheduleUpdate);
    const unsubRepost = includeReposts
      ? subscribeToRepostInserts(scheduleUpdate)
      : () => {};

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubPost();
      unsubRepost();
    };
  }, [includeReposts]);

  const clearNewPosts = useCallback(() => {
    setHasNewPosts(false);
  }, []);

  return { hasNewPosts, clearNewPosts, connectionState };
}
