import { createClient } from "@supabase/supabase-js";
import { getRealtimeKeyIssue } from "@/lib/realtime-config";
import {
  abandonRealtime,
  isRealtimeAbandoned,
} from "@/lib/realtime-lifecycle";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (typeof window !== "undefined") {
  const keyIssue = getRealtimeKeyIssue();
  if (keyIssue) {
    console.warn(`Realtime: ${keyIssue}`);
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
    reconnectAfterMs: (tries: number) => {
      if (isRealtimeAbandoned()) {
        return 2_147_483_647;
      }
      if (tries > 3) {
        void supabase.removeAllChannels();
        supabase.realtime.disconnect();
        abandonRealtime();
        return 2_147_483_647;
      }
      return [2000, 5000, 10000][tries - 1] ?? 10000;
    },
  },
});

export function disconnectRealtime(): void {
  void supabase.removeAllChannels();
  supabase.realtime.disconnect();
  abandonRealtime();
}
