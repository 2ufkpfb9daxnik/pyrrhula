import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, disconnectRealtime } from "@/utils/supabase";
import {
  isRealtimeAbandoned,
  recordRealtimeFailure,
  resetRealtimeFailures,
  shouldUseRealtime,
} from "@/lib/realtime-lifecycle";

type Listener = () => void;

const POST_CHANNEL = "app-realtime-posts";
const REPOST_CHANNEL = "app-realtime-reposts";

const postListeners = new Set<Listener>();
const repostListeners = new Set<Listener>();

let postChannel: RealtimeChannel | null = null;
let repostChannel: RealtimeChannel | null = null;

const notificationListeners = new Map<string, Set<Listener>>();
const notificationChannelRefs = new Map<string, RealtimeChannel>();

function notifyUser(userId: string): void {
  const listeners = notificationListeners.get(userId);
  if (!listeners) return;
  for (const listener of listeners) {
    listener();
  }
}

function handleChannelError(channelName: string, status: string, err?: Error): void {
  recordRealtimeFailure(channelName);
  if (isRealtimeAbandoned()) {
    disconnectRealtime();
    return;
  }
  console.warn(
    `Realtime: チャンネル "${channelName}" でエラー (${status})`,
    err?.message,
  );
}

function subscribeChannel(
  name: string,
  setup: (channel: RealtimeChannel) => RealtimeChannel,
): RealtimeChannel | null {
  if (!shouldUseRealtime()) {
    return null;
  }

  const existing = supabase
    .getChannels()
    .find((ch) => ch.subTopic === name || ch.topic === `realtime:${name}`);

  if (existing && (existing.state === "joined" || existing.state === "joining")) {
    return existing;
  }

  if (existing) {
    void supabase.removeChannel(existing);
  }

  const channel = setup(supabase.channel(name));
  if (channel.state !== "joined" && channel.state !== "joining") {
    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        resetRealtimeFailures();
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        handleChannelError(name, status, err);
      }
    });
  }
  return channel;
}

function ensureNotificationChannel(userId: string): void {
  if (!shouldUseRealtime()) return;

  const channelName = `app-realtime-notifications-${userId}`;
  const existing = notificationChannelRefs.get(userId);

  if (existing && (existing.state === "joined" || existing.state === "joining")) {
    return;
  }

  if (existing) {
    void supabase.removeChannel(existing);
  }

  const channel = subscribeChannel(channelName, (ch) =>
    ch.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "Notification",
        filter: `receiverId=eq.${userId}`,
      },
      () => notifyUser(userId),
    ),
  );
  if (channel) {
    notificationChannelRefs.set(userId, channel);
  }
}

export function subscribeToNotifications(
  userId: string,
  listener: Listener,
): () => void {
  if (!shouldUseRealtime()) {
    return () => {};
  }

  if (!notificationListeners.has(userId)) {
    notificationListeners.set(userId, new Set());
  }
  notificationListeners.get(userId)!.add(listener);
  ensureNotificationChannel(userId);

  return () => {
    const listeners = notificationListeners.get(userId);
    if (!listeners) return;
    listeners.delete(listener);
    if (listeners.size === 0) {
      notificationListeners.delete(userId);
      const channel = notificationChannelRefs.get(userId);
      if (channel) {
        void supabase.removeChannel(channel);
        notificationChannelRefs.delete(userId);
      }
    }
  };
}

function notify(listeners: Set<Listener>): void {
  for (const listener of listeners) {
    listener();
  }
}

function ensurePostChannel(): void {
  if (!shouldUseRealtime()) return;
  if (postChannel && (postChannel.state === "joined" || postChannel.state === "joining")) {
    return;
  }

  postChannel = subscribeChannel(POST_CHANNEL, (channel) =>
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "Post" },
      () => notify(postListeners),
    ),
  );
}

function ensureRepostChannel(): void {
  if (!shouldUseRealtime()) return;
  if (
    repostChannel &&
    (repostChannel.state === "joined" || repostChannel.state === "joining")
  ) {
    return;
  }

  repostChannel = subscribeChannel(REPOST_CHANNEL, (channel) =>
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "Repost" },
      () => notify(repostListeners),
    ),
  );
}

export function subscribeToPostInserts(listener: Listener): () => void {
  if (!shouldUseRealtime()) {
    return () => {};
  }

  ensurePostChannel();
  postListeners.add(listener);
  return () => {
    postListeners.delete(listener);
  };
}

export function subscribeToRepostInserts(listener: Listener): () => void {
  if (!shouldUseRealtime()) {
    return () => {};
  }

  ensureRepostChannel();
  repostListeners.add(listener);
  return () => {
    repostListeners.delete(listener);
  };
}