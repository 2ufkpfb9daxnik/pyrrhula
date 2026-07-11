"use client";

import { Info } from "lucide-react";
import { useTimelineSettings } from "@/app/_hooks/useTimelineSettings";

export function TimelineSettingsPanel() {
  const { settings, updateSettings, isLoaded } = useTimelineSettings();

  if (!isLoaded) return null;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-blue-400" />
        <p className="text-sm text-blue-200/90">
          タイムラインのリアルタイム更新には Supabase Realtime が必要です。
          初回は SQL Editor で{" "}
          <code className="text-xs">supabase/migrations/enable_realtime.sql</code>{" "}
          を実行してください。
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-400">
          新着投稿の更新方法
        </h3>

        <label
          htmlFor="update-mode-auto"
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-800 p-3 transition-colors hover:bg-gray-800/50"
        >
          <input
            id="update-mode-auto"
            type="radio"
            name="update-mode"
            className="mt-0.5"
            checked={settings.updateMode === "auto"}
            onChange={() => updateSettings({ updateMode: "auto" })}
          />
          <div>
            <p className="text-sm font-medium">自動的に更新する（推奨）</p>
            <p className="mt-1 text-xs text-gray-500">
              他の端末や他ユーザーの投稿が届くと、自動でタイムラインに反映されます。
            </p>
          </div>
        </label>

        <label
          htmlFor="update-mode-banner"
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-800 p-3 transition-colors hover:bg-gray-800/50"
        >
          <input
            id="update-mode-banner"
            type="radio"
            name="update-mode"
            className="mt-0.5"
            checked={settings.updateMode === "banner"}
            onChange={() => updateSettings({ updateMode: "banner" })}
          />
          <div>
            <p className="text-sm font-medium">バナーを表示する</p>
            <p className="mt-1 text-xs text-gray-500">
              新着があるときだけ「↑ 新しい投稿があります」を表示し、タップで更新します。
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
