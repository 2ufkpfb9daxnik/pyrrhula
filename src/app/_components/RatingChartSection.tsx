"use client";

import { useState } from "react";
import { BarChart, ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RatingChart } from "@/app/_components/RatingChart";
import { StaleRefreshBanner } from "@/app/_components/StaleRefreshBanner";
import { cn } from "@/lib/utils";
import type { RatingHistoryEntry } from "@/app/_hooks/useUserQueries";

interface RatingChartSectionProps {
  history: RatingHistoryEntry[];
  isLoading: boolean;
  isStale: boolean;
  isFetching: boolean;
  dataUpdatedAt: number;
  onRefresh: () => void;
  className?: string;
}

export function RatingChartSection({
  history,
  isLoading,
  isStale,
  isFetching,
  dataUpdatedAt,
  onRefresh,
  className,
}: RatingChartSectionProps) {
  const [showOnMobile, setShowOnMobile] = useState(false);

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex h-[200px] items-center justify-center lg:h-full lg:min-h-[280px]",
          className,
        )}
      >
        <LoaderCircle className="size-8 animate-spin" />
      </div>
    );
  }

  if (history.length === 0) {
    return null;
  }

  const chartContent = (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">レート履歴</h3>
      {isStale && (
        <StaleRefreshBanner
          isStale={isStale}
          isFetching={isFetching}
          dataUpdatedAt={dataUpdatedAt}
          onRefresh={onRefresh}
          label="レート履歴を更新"
        />
      )}
      <RatingChart history={history} compact />
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      {/* モバイル: ボタンで開閉 */}
      <div className="lg:hidden">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowOnMobile((prev) => !prev)}
        >
          <BarChart className="mr-2 size-4" />
          レート履歴を{showOnMobile ? "隠す" : "表示"}
          {showOnMobile ? (
            <ChevronUp className="ml-auto size-4" />
          ) : (
            <ChevronDown className="ml-auto size-4" />
          )}
        </Button>
        {showOnMobile && <div className="mt-3">{chartContent}</div>}
      </div>

      {/* デスクトップ: 常に表示 */}
      <div className="hidden lg:block">{chartContent}</div>
    </div>
  );
}
