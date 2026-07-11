import { isRealtimeConfigured } from "@/lib/realtime-config";

/** この回数失敗したら Realtime の再接続を止める */
export const MAX_REALTIME_FAILURES = 3;

let failureCount = 0;
let abandoned = false;
let warnedAbandon = false;

export function isRealtimeAbandoned(): boolean {
  return abandoned;
}

export function shouldUseRealtime(): boolean {
  return isRealtimeConfigured() && !abandoned;
}

export function recordRealtimeFailure(_source: string): void {
  if (abandoned) return;

  failureCount += 1;
  if (failureCount >= MAX_REALTIME_FAILURES) {
    abandonRealtime();
  }
}

export function abandonRealtime(): void {
  if (abandoned) return;
  abandoned = true;

  if (!warnedAbandon) {
    warnedAbandon = true;
    console.warn(
      `Realtime: 接続に${MAX_REALTIME_FAILURES}回失敗したため停止しました。タイムラインは手動更新・投稿時の即時反映が使えます。`,
    );
  }
}

export function resetRealtimeFailures(): void {
  failureCount = 0;
}
