"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabase";

interface UseRealtimeTimelineOptions {
  /** Supabase Realtime チャンネル名（一意である必要があります） */
  channelName: string;
  /** Repost テーブルの変更も購読するか（デフォルト: false） */
  includeReposts?: boolean;
}

/**
 * Supabase Realtime を使ってタイムラインの新着投稿を検知するフック。
 * Post テーブル（および必要に応じて Repost テーブル）への INSERT を購読し、
 * 新着があれば hasNewPosts を true にします。
 */
export function useRealtimeTimeline({
  channelName,
  includeReposts = false,
}: UseRealtimeTimelineOptions) {
  const [hasNewPosts, setHasNewPosts] = useState(false);

  useEffect(() => {
    // 環境変数が未設定の場合は購読しない
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "Post" },
      () => {
        setHasNewPosts(true);
      },
    );

    if (includeReposts) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Repost" },
        () => {
          setHasNewPosts(true);
        },
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, includeReposts]);

  const clearNewPosts = useCallback(() => {
    setHasNewPosts(false);
  }, []);

  return { hasNewPosts, clearNewPosts };
}
