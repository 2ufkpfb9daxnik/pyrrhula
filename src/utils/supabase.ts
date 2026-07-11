import { createClient } from "@supabase/supabase-js";
import { getRealtimeKeyIssue } from "@/lib/realtime-config";

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
  },
});
