export function getRealtimeKeyIssue(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です";
  }
  if (key.startsWith("sb_publishable_")) {
    return "sb_publishable_ キーは Realtime に使えません。Dashboard → API の anon (eyJ...) キーを Vercel に設定してください";
  }
  if (!url.includes("supabase.co")) {
    return "NEXT_PUBLIC_SUPABASE_URL の形式が正しくない可能性があります";
  }
  return null;
}

export function isRealtimeConfigured(): boolean {
  return getRealtimeKeyIssue() === null;
}
