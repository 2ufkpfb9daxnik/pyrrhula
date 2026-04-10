"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/utils/supabase";

/** 接続失敗をこの回数繰り返したら再試行を止める */
const MAX_RETRY_ATTEMPTS = 5;

interface UseRealtimeTimelineOptions {
  /** Supabase Realtime チャンネル名（一意である必要があります） */
  channelName: string;
  /** Repost テーブルの変更も購読するか（デフォルト: false） */
  includeReposts?: boolean;
  /**
   * 自動更新モード（デフォルト: false）
   * true の場合、新着があると onAutoUpdate が呼ばれ hasNewPosts は更新されない
   */
  autoUpdate?: boolean;
  /** 自動更新モード時に呼ばれるコールバック */
  onAutoUpdate?: () => void;
}

/**
 * Supabase Realtime を使ってタイムラインの新着投稿を検知するフック。
 * Post テーブル（および必要に応じて Repost テーブル）への INSERT を購読し、
 * 新着があれば hasNewPosts を true にします。
 * 接続に MAX_RETRY_ATTEMPTS 回連続失敗した場合は再試行を停止します。
 */
export function useRealtimeTimeline({
  channelName,
  includeReposts = false,
  autoUpdate = false,
  onAutoUpdate,
}: UseRealtimeTimelineOptions) {
  const [hasNewPosts, setHasNewPosts] = useState(false);

  // ref で最新の値を保持することで、チャンネル再登録なしに反映できる
  const autoUpdateRef = useRef(autoUpdate);
  const onAutoUpdateRef = useRef(onAutoUpdate);
  useEffect(() => {
    autoUpdateRef.current = autoUpdate;
    onAutoUpdateRef.current = onAutoUpdate;
  });

  useEffect(() => {
    // 環境変数が未設定の場合は購読しない
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    // チャンネルごとのリトライカウンタ。クロージャ内に閉じており
    // cleanup で stopped=true にすることで古いコールバックの副作用を防ぐ。
    let retryCount = 0;
    let stopped = false;

    const channel = supabase.channel(channelName);

    const handleInsert = () => {
      if (stopped) return;
      // autoUpdateRef / onAutoUpdateRef は毎レンダーで更新されるため
      // 依存配列に追加しなくても常に最新値を参照できる
      if (autoUpdateRef.current && onAutoUpdateRef.current) {
        onAutoUpdateRef.current();
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

    channel.subscribe((status) => {
      if (stopped) return;
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        retryCount += 1;
        if (retryCount >= MAX_RETRY_ATTEMPTS) {
          stopped = true;
          supabase.removeChannel(channel);
          console.warn(
            `Realtime: ${MAX_RETRY_ATTEMPTS}回の接続失敗後、チャンネル "${channelName}" への再接続を停止しました。再読み込みすると復旧します。`,
          );
        }
      }
    });

    return () => {
      stopped = true;
      supabase.removeChannel(channel);
    };
  }, [channelName, includeReposts]);

  const clearNewPosts = useCallback(() => {
    setHasNewPosts(false);
  }, []);

  return { hasNewPosts, clearNewPosts };
}
