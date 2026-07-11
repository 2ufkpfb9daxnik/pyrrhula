"use client";

import { useAppTheme } from "@/app/_hooks/useAppTheme";
import { THEME_COLOR_FIELDS } from "@/lib/app-theme";
import { Button } from "@/components/ui/button";

export function TimelineSettingsPanel() {
  const { theme, updateTheme, resetTheme, isLoaded: themeLoaded } =
    useAppTheme();

  if (!themeLoaded) return null;

  return (
    <div className="max-h-[70vh] space-y-6 overflow-y-auto p-4">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-400">表示の色</h3>
        <p className="text-xs text-gray-500">
          レーティングのユーザー名の色は変更できません。それ以外の UI
          色をカスタマイズできます。
        </p>
        <div className="space-y-3">
          {THEME_COLOR_FIELDS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 p-3"
            >
              <span className="text-sm">{label}</span>
              <input
                type="color"
                value={theme[key]}
                onChange={(e) => updateTheme({ [key]: e.target.value })}
                className="size-8 cursor-pointer rounded border-0 bg-transparent"
                aria-label={label}
              />
            </label>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={resetTheme}>
          色をデフォルト（白黒）に戻す
        </Button>
      </div>
    </div>
  );
}
