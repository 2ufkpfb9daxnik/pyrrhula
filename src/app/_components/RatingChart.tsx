"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";

interface RatingHistory {
  delta: number;
  rating: number;
  createdAt: string;
  reason?: string;
}

interface RatingChartProps {
  history: RatingHistory[];
}

export function RatingChart({ history }: RatingChartProps) {
  const data = history.map((item) => ({
    ...item,
    createdAt: new Date(item.createdAt),
    formattedDate: formatDistanceToNow(new Date(item.createdAt)),
  }));

  return (
    <div className="mt-4 h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={[
              (dataMin: number) => Math.floor(dataMin * 0.9),
              (dataMax: number) => Math.ceil(dataMax * 1.1),
            ]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border bg-background p-2 shadow-lg">
                    <p className="text-sm font-medium">レート: {data.rating}</p>
                    <p className="text-sm text-muted-foreground">
                      変動: {data.delta > 0 ? `+${data.delta}` : data.delta}
                    </p>
                    {data.reason && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        理由: {data.reason}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(data.createdAt).toLocaleString()}
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
            stroke="#8884d8"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
