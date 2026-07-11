"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";

interface StaleRefreshBannerProps {
  isStale: boolean;
  isFetching: boolean;
  dataUpdatedAt?: number;
  onRefresh: () => void;
  label?: string;
}

export function StaleRefreshBanner({
  isStale,
  isFetching,
  dataUpdatedAt,
  onRefresh,
  label = "最新の内容に更新",
}: StaleRefreshBannerProps) {
  if (!isStale && !isFetching) return null;

  const updatedLabel =
    dataUpdatedAt && dataUpdatedAt > 0
      ? `${formatDistanceToNow(new Date(dataUpdatedAt))}のデータを表示中`
      : "キャッシュを表示中";

  return (
    <div className="sticky top-0 z-30 flex justify-center px-4 py-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isFetching}
        className="gap-2 rounded-full border-primary/40 bg-background/95 shadow-lg backdrop-blur-md"
      >
        <RefreshCw
          className={`size-4 ${isFetching ? "animate-spin" : ""}`}
        />
        {isFetching ? "更新中..." : `${updatedLabel} — ${label}`}
      </Button>
    </div>
  );
}
