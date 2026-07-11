import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";

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

function ensureNotificationChannel(userId: string): void {
  const channelName = `app-realtime-notifications-${userId}`;
  let channel = notificationChannelRefs.get(userId);

  if (channel && (channel.state === "joined" || channel.state === "joining")) {
    return;
  }

  if (channel) {
    void supabase.removeChannel(channel);
  }

  channel = subscribeChannel(channelName, (ch) =>
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
  notificationChannelRefs.set(userId, channel);
}

export function subscribeToNotifications(
  userId: string,
  listener: Listener,
): () => void {
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

function subscribeChannel(
  name: string,
  setup: (channel: RealtimeChannel) => RealtimeChannel,
): RealtimeChannel {
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
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(
          `Realtime: チャンネル "${name}" でエラー`,
          err?.message ?? status,
        );
      }
    });
  }
  return channel;
}

function ensurePostChannel(): void {
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
  ensurePostChannel();
  postListeners.add(listener);
  return () => {
    postListeners.delete(listener);
  };
}

export function subscribeToRepostInserts(listener: Listener): () => void {
  ensureRepostChannel();
  repostListeners.add(listener);
  return () => {
    repostListeners.delete(listener);
  };
}
