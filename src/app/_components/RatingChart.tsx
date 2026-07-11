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

type TimeRange = "all" | "1d" | "1w" | "1m" | "1y";

interface RatingChartProps {
  history: RatingHistory[];
  compact?: boolean;
}

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all", label: "全期間" },
  { value: "1d", label: "1日" },
  { value: "1w", label: "1週間" },
  { value: "1m", label: "1ヶ月" },
  { value: "1y", label: "1年" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function getCutoffDate(range: TimeRange): Date | null {
  if (range === "all") return null;
  const now = Date.now();
  switch (range) {
    case "1d":
      return new Date(now - DAY_MS);
    case "1w":
      return new Date(now - 7 * DAY_MS);
    case "1m":
      return new Date(now - 30 * DAY_MS);
    case "1y":
      return new Date(now - 365 * DAY_MS);
  }
}

function getTickFormat(range: TimeRange, spanDays: number): string {
  if (range === "1d") return "HH:mm";
  if (range === "1w") return "M/d HH:mm";
  if (range === "all" || spanDays > 90) return "yyyy/M";
  return "M/d";
}

function buildRangeData(
  sortedHistory: RatingHistory[],
  range: TimeRange,
): RatingHistory[] {
  const cutoff = getCutoffDate(range);
  if (!cutoff) return sortedHistory;

  const cutoffMs = cutoff.getTime();
  const inRange = sortedHistory.filter(
    (item) => new Date(item.createdAt).getTime() >= cutoffMs,
  );

  const beforeCutoff = sortedHistory.filter(
    (item) => new Date(item.createdAt).getTime() < cutoffMs,
  );
  const anchor = beforeCutoff.at(-1);

  if (inRange.length > 0) {
    if (
      anchor &&
      new Date(inRange[0].createdAt).getTime() > cutoffMs
    ) {
      return [
        { ...anchor, createdAt: cutoff.toISOString() },
        ...inRange,
      ];
    }
    return inRange;
  }

  if (anchor) {
    return [
      { ...anchor, createdAt: cutoff.toISOString() },
      { ...anchor, createdAt: new Date().toISOString() },
    ];
  }

  return [];
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

  const rangeData = useMemo(
    () => buildRangeData(sortedHistory, range),
    [sortedHistory, range],
  );

  const filteredData = useMemo(
    () =>
      rangeData.map((item) => ({
        ...item,
        time: new Date(item.createdAt).getTime(),
      })),
    [rangeData],
  );

  const xDomain = useMemo((): [number, number] | ["dataMin", "dataMax"] => {
    if (range === "all") return ["dataMin", "dataMax"];
    const cutoff = getCutoffDate(range);
    if (!cutoff) return ["dataMin", "dataMax"];
    return [cutoff.getTime(), Date.now()];
  }, [range]);

  const spanDays = useMemo(() => {
    if (range === "1d") return 1;
    if (range === "1w") return 7;
    if (range === "1m") return 30;
    if (range === "1y") return 365;
    if (filteredData.length < 2) return 0;
    const first = filteredData[0].time;
    const last = filteredData[filteredData.length - 1].time;
    return (last - first) / DAY_MS;
  }, [filteredData, range]);

  const tickFormat = getTickFormat(range, spanDays);
  const chartHeight = compact ? 220 : 280;

  if (sortedHistory.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        レート履歴はありません
      </div>
    );
  }

  if (filteredData.length === 0) {
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
        <div className="text-sm text-muted-foreground">
          この期間のレート履歴はありません
        </div>
      </div>
    );
  }

  const yMin = Math.min(...filteredData.map((d) => d.rating));
  const yMax = Math.max(...filteredData.map((d) => d.rating));
  const yPadding = Math.max(1, Math.ceil((yMax - yMin) * 0.1));

  const rangeLabel =
    range === "all"
      ? `${format(new Date(sortedHistory[0].createdAt), "yyyy年M月d日")}〜${format(new Date(sortedHistory[sortedHistory.length - 1].createdAt), "yyyy年M月d日")}（${sortedHistory.length}件）`
      : `${format(new Date(filteredData[0].time), "yyyy年M月d日 HH:mm")}〜${format(new Date(filteredData[filteredData.length - 1].time), "yyyy年M月d日 HH:mm")}（${rangeData.length}件）`;

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

      <p className="text-xs text-muted-foreground">{rangeLabel}</p>

      <div
        className={cn("w-full", compact ? "min-w-0" : "")}
        style={{ height: chartHeight }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              type="number"
              domain={xDomain}
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
