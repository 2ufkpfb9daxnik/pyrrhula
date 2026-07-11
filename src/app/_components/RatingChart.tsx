"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RatingHistory {
  delta: number;
  rating: number;
  createdAt: string;
  reason?: string;
}

type TimeRange = "all" | "1y" | "6m" | "3m" | "1m";

interface RatingChartProps {
  history: RatingHistory[];
  compact?: boolean;
}

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all", label: "全期間" },
  { value: "1y", label: "1年" },
  { value: "6m", label: "6ヶ月" },
  { value: "3m", label: "3ヶ月" },
  { value: "1m", label: "1ヶ月" },
];

function getCutoffDate(range: TimeRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  switch (range) {
    case "1y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "6m":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "3m":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "1m":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }
}

function getTickFormat(range: TimeRange, spanDays: number): string {
  if (range === "all" || spanDays > 180) return "yyyy/M";
  if (spanDays > 30) return "M/d";
  return "M/d HH:mm";
}

export function RatingChart({ history, compact = false }: RatingChartProps) {
  const [range, setRange] = useState<TimeRange>("all");

  const sortedHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [history],
  );

  const filteredData = useMemo(() => {
    const cutoff = getCutoffDate(range);
    const filtered = cutoff
      ? sortedHistory.filter((item) => new Date(item.createdAt) >= cutoff)
      : sortedHistory;

    return filtered.map((item) => ({
      ...item,
      time: new Date(item.createdAt).getTime(),
    }));
  }, [sortedHistory, range]);

  const spanDays = useMemo(() => {
    if (filteredData.length < 2) return 0;
    const first = filteredData[0].time;
    const last = filteredData[filteredData.length - 1].time;
    return (last - first) / (1000 * 60 * 60 * 24);
  }, [filteredData]);

  const tickFormat = getTickFormat(range, spanDays);
  const chartHeight = compact ? 220 : 280;

  if (filteredData.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        この期間のレート履歴はありません
      </div>
    );
  }

  const yMin = Math.min(...filteredData.map((d) => d.rating));
  const yMax = Math.max(...filteredData.map((d) => d.rating));
  const yPadding = Math.max(1, Math.ceil((yMax - yMin) * 0.1));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {RANGE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={range === option.value ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => setRange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {range === "all" && sortedHistory.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {format(new Date(sortedHistory[0].createdAt), "yyyy年M月d日")}
          〜
          {format(
            new Date(sortedHistory[sortedHistory.length - 1].createdAt),
            "yyyy年M月d日",
          )}
          （{sortedHistory.length}件）
        </p>
      )}

      <div className={cn("w-full", compact ? "min-w-0" : "")} style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tick={{ fontSize: 10 }}
              tickFormatter={(ts) => format(new Date(ts), tickFormat)}
              minTickGap={compact ? 24 : 32}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              width={compact ? 36 : 44}
              domain={[
                Math.max(0, Math.floor(yMin - yPadding)),
                Math.ceil(yMax + yPadding),
              ]}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload as (typeof filteredData)[0];
                  return (
                    <div className="rounded-lg border border-border bg-background p-2 shadow-lg">
                      <p className="text-sm font-medium">
                        レート: {point.rating}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        変動: {point.delta > 0 ? `+${point.delta}` : point.delta}
                      </p>
                      {point.reason && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          理由: {point.reason}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(point.createdAt), "yyyy年M月d日 HH:mm")}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={filteredData.length <= 30 ? { r: 3 } : false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
