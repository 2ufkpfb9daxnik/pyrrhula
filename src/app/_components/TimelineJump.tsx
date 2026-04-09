"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function TimelineJump() {
  const [mode, setMode] = useState<"days" | "hours" | "datetime">("days");
  const [n, setN] = useState<number>(1);
  const [datetime, setDatetime] = useState<string>(
    new Date().toISOString().slice(0, 16),
  );

  const performJump = () => {
    let target: Date;
    if (mode === "days") {
      target = new Date();
      target.setDate(target.getDate() - Math.max(0, Math.floor(n)));
    } else if (mode === "hours") {
      target = new Date();
      target.setHours(target.getHours() - Math.max(0, Math.floor(n)));
    } else {
      // datetime input is yyyy-MM-ddTHH:mm
      if (!datetime) {
        toast.error("日時を入力してください");
        return;
      }
      target = new Date(datetime);
      if (Number.isNaN(target.getTime())) {
        toast.error("有効な日時を入力してください");
        return;
      }
    }

    // Find posts with data-created-at
    const posts = Array.from(
      document.querySelectorAll<HTMLElement>("[data-created-at]"),
    );
    if (posts.length === 0) {
      toast.error("タイムラインの投稿が見つかりません");
      return;
    }

    // Posts are ordered newest first; find first post with createdAt <= target (older)
    let found: HTMLElement | null = null;
    for (const el of posts) {
      const ts = el.getAttribute("data-created-at");
      if (!ts) continue;
      const d = new Date(ts);
      if (d <= target) {
        found = el;
        break;
      }
    }

    if (!found) {
      // If not found, scroll to last post (oldest)
      const last = posts[posts.length - 1];
      last.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.success(
        "指定日時より古い投稿が見つかりませんでした。最古の投稿へ移動しました。",
      );
      return;
    }

    found.scrollIntoView({ behavior: "smooth", block: "center" });
    toast.success("指定した時点の位置へ移動しました");
  };

  return (
    <div className="mt-4 w-full">
      <div className="mb-2 text-sm font-semibold">タイムラインを再現</div>

      <div className="flex items-center gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          className="rounded-md bg-background px-2 py-1 text-sm"
        >
          <option value="days">n日前</option>
          <option value="hours">n時間前</option>
          <option value="datetime">日時を指定</option>
        </select>

        {mode === "days" && (
          <Input
            type="number"
            value={String(n)}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-20"
            min={0}
          />
        )}

        {mode === "hours" && (
          <Input
            type="number"
            value={String(n)}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-20"
            min={0}
          />
        )}

        {mode === "datetime" && (
          <Input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
          />
        )}

        <Button onClick={performJump} size="sm">
          再現する
        </Button>
      </div>
    </div>
  );
}
