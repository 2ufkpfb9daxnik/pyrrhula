"use client";

import { useEffect, useState, useRef } from "react";
import {
  isRealtimeAbandoned,
  shouldUseRealtime,
} from "@/lib/realtime-lifecycle";
import {
  subscribeToPostInserts,
  subscribeToRepostInserts,
} from "@/lib/realtime-manager";

/** 連続 INSERT をまとめて1回の更新にする（無料枠・API負荷軽減） */
const DEBOUNCE_MS = 800;

interface UseRealtimeTimelineOptions {
  channelName: string;
  includeReposts?: boolean;
  onAutoUpdate?: () => void;
}

/**
 * Supabase Realtime で Post / Repost の INSERT を購読する。
 * 接続はアプリ全体で1本だけ共有する（WebSocket の作り直しを防ぐ）。
 */
export function useRealtimeTimeline({
  includeReposts = false,
  onAutoUpdate,
}: UseRealtimeTimelineOptions) {
  const [connectionState, setConnectionState] = useState<
    "idle" | "connected" | "error"
  >("idle");

  const onAutoUpdateRef = useRef(onAutoUpdate);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onAutoUpdateRef.current = onAutoUpdate;
  });

  useEffect(() => {
    if (!shouldUseRealtime()) {
      setConnectionState(isRealtimeAbandoned() ? "error" : "idle");
      return;
    }

    setConnectionState("idle");

    const scheduleUpdate = () => {
      setConnectionState("connected");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onAutoUpdateRef.current?.();
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

  return { connectionState };
}
