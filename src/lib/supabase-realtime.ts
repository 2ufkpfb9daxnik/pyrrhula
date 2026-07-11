import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";

function channelTopic(channelName: string): string {
  return `realtime:${channelName}`;
}

/** 同名チャンネルが残っていると subscribe 二重呼び出しで落ちるため、先に掃除する */
export function removeRealtimeChannel(channelName: string): void {
  const topic = channelTopic(channelName);
  for (const channel of supabase.getChannels()) {
    if (channel.topic === topic || channel.subTopic === channelName) {
      void supabase.removeChannel(channel);
    }
  }
}

export function createRealtimeChannel(channelName: string): RealtimeChannel {
  removeRealtimeChannel(channelName);
  return supabase.channel(channelName);
}

export function safeSubscribe(
  channel: RealtimeChannel,
  onStatus?: (status: string) => void,
): void {
  const state = channel.state;
  if (state === "joined" || state === "joining") {
    return;
  }

  try {
    if (onStatus) {
      channel.subscribe(onStatus);
    } else {
      channel.subscribe();
    }
  } catch (error) {
    console.warn("Realtime: subscribe に失敗しました", error);
  }
}

export function isRealtimeConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
