"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  createRealtimeChannel,
  isRealtimeConfigured,
  safeSubscribe,
} from "@/lib/supabase-realtime";
import { supabase } from "@/utils/supabase";

/** 接続失敗をこの回数繰り返したら再試行を止める */
const MAX_RETRY_ATTEMPTS = 5;

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
 * スマホで投稿 → PC のタイムラインに自動反映、といった同期に使う。
 *
 * 前提: Supabase で Realtime を有効化していること（supabase/migrations/enable_realtime.sql 参照）
 */
export function useRealtimeTimeline({
  channelName,
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

    let retryCount = 0;
    let stopped = false;

    const channel = createRealtimeChannel(channelName);

    const scheduleUpdate = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onAutoUpdateRef.current?.();
      }, DEBOUNCE_MS);
    };

    const handleInsert = () => {
      if (stopped) return;
      if (autoUpdateRef.current && onAutoUpdateRef.current) {
        scheduleUpdate();
      } else {
        setHasNewPosts(true);
      }
    };

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "Post" },
      handleInsert,
    );

    if (includeReposts) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Repost" },
        handleInsert,
      );
    }

    safeSubscribe(channel, (status) => {
      if (stopped) return;
      if (status === "SUBSCRIBED") {
        setConnectionState("connected");
        retryCount = 0;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setConnectionState("error");
        retryCount += 1;
        if (retryCount >= MAX_RETRY_ATTEMPTS) {
          stopped = true;
          void supabase.removeChannel(channel);
          console.warn(
            `Realtime: チャンネル "${channelName}" への接続を停止しました。Supabase で Realtime が有効か確認してください。`,
          );
        }
      }
    });

    return () => {
      stopped = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [channelName, includeReposts]);

  const clearNewPosts = useCallback(() => {
    setHasNewPosts(false);
  }, []);

  return { hasNewPosts, clearNewPosts, connectionState };
}
