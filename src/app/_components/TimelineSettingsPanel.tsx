"use client";

import { FlaskConical } from "lucide-react";
import { useTimelineSettings } from "@/app/_hooks/useTimelineSettings";

export function TimelineSettingsPanel() {
  const { settings, updateSettings, isLoaded } = useTimelineSettings();

  if (!isLoaded) return null;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
        <FlaskConical className="mt-0.5 size-4 shrink-0 text-yellow-500" />
        <p className="text-sm text-yellow-500">
          この機能は実験的であり、実現できるかわかりません。
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-400">
          新着投稿の更新方法
        </h3>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-800 p-3 transition-colors hover:bg-gray-800/50">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={settings.updateMode === "banner"}
            onChange={() => updateSettings({ updateMode: "banner" })}
          />
          <div>
            <p className="text-sm font-medium">
              バナーを表示する（デフォルト）
            </p>
            <p className="mt-1 text-xs text-gray-500">
              新しい投稿があると「↑
              新しい投稿があります」というバナーが表示されます。バナーをクリックすると更新されます。
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-800 p-3 transition-colors hover:bg-gray-800/50">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={settings.updateMode === "auto"}
            onChange={() => updateSettings({ updateMode: "auto" })}
          />
          <div>
            <p className="text-sm font-medium">自動的に更新する</p>
            <p className="mt-1 text-xs text-gray-500">
              新しい投稿が届くと自動的に読み込まれます。スクロール位置は保持されます。
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
