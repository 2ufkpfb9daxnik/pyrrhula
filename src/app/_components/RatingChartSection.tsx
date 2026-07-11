"use client";

import { useState } from "react";
import { BarChart, ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RatingChart } from "@/app/_components/RatingChart";
import { cn } from "@/lib/utils";
import type { RatingHistoryEntry } from "@/app/_hooks/useUserQueries";

interface RatingChartSectionProps {
  history: RatingHistoryEntry[];
  isLoading: boolean;
  className?: string;
}

export function RatingChartSection({
  history,
  isLoading,
  className,
}: RatingChartSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isLoading && history.length === 0) {
    return null;
  }

  const chartContent = (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">レート履歴</h3>
      <RatingChart history={history} compact />
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isLoading}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <BarChart className="mr-2 size-4" />
        レート履歴を{isOpen ? "隠す" : "表示"}
        {isOpen ? (
          <ChevronUp className="ml-auto size-4" />
        ) : (
          <ChevronDown className="ml-auto size-4" />
        )}
      </Button>

      {isOpen && (
        <div className="mt-3">
          {isLoading ? (
            <div className="flex h-[200px] items-center justify-center">
              <LoaderCircle className="size-8 animate-spin" />
            </div>
          ) : (
            chartContent
          )}
        </div>
      )}
    </div>
  );
}
