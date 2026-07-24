"use client";

import { useAppTheme } from "@/app/_hooks/useAppTheme";
import { useComposeHeight } from "@/app/_hooks/useComposeHeight";
import { THEME_COLOR_FIELDS } from "@/lib/app-theme";
import {
  COMPOSE_HEIGHT_MAX,
  COMPOSE_HEIGHT_MIN,
  DEFAULT_COMPOSE_HEIGHT,
} from "@/lib/compose-height";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TimelineSettingsPanel() {
  const { theme, updateTheme, resetTheme, isLoaded: themeLoaded } =
    useAppTheme();
  const {
    height: composeHeight,
    updateHeight,
    resetHeight,
    isLoaded: heightLoaded,
  } = useComposeHeight();

  if (!themeLoaded || !heightLoaded) return null;

  return (
    <div className="max-h-[70vh] space-y-8 overflow-y-auto p-4">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-400">投稿フォームの高さ</h3>
        <p className="text-xs text-gray-500">
          投稿入力欄の最小の高さをピクセルで指定できます（
          {COMPOSE_HEIGHT_MIN}〜{COMPOSE_HEIGHT_MAX}）。
        </p>
        <label className="block space-y-2 rounded-lg border border-gray-800 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">通常（サイドバーなど）</span>
            <span className="text-xs text-gray-500">
              {composeHeight.desktopPx}px
            </span>
          </div>
          <input
            type="range"
            min={COMPOSE_HEIGHT_MIN}
            max={COMPOSE_HEIGHT_MAX}
            step={8}
            value={composeHeight.desktopPx}
            onChange={(e) =>
              updateHeight({ desktopPx: Number(e.target.value) })
            }
            className="w-full"
            aria-label="通常の投稿フォームの高さ"
          />
          <Input
            type="number"
            min={COMPOSE_HEIGHT_MIN}
            max={COMPOSE_HEIGHT_MAX}
            value={composeHeight.desktopPx}
            onChange={(e) =>
              updateHeight({ desktopPx: Number(e.target.value) })
            }
            className="h-8 w-28"
          />
        </label>
        <label className="block space-y-2 rounded-lg border border-gray-800 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">モバイル（投稿ダイアログ）</span>
            <span className="text-xs text-gray-500">
              {composeHeight.mobilePx}px
            </span>
          </div>
          <input
            type="range"
            min={COMPOSE_HEIGHT_MIN}
            max={COMPOSE_HEIGHT_MAX}
            step={8}
            value={composeHeight.mobilePx}
            onChange={(e) =>
              updateHeight({ mobilePx: Number(e.target.value) })
            }
            className="w-full"
            aria-label="モバイル投稿フォームの高さ"
          />
          <Input
            type="number"
            min={COMPOSE_HEIGHT_MIN}
            max={COMPOSE_HEIGHT_MAX}
            value={composeHeight.mobilePx}
            onChange={(e) =>
              updateHeight({ mobilePx: Number(e.target.value) })
            }
            className="h-8 w-28"
          />
        </label>
        <p className="text-xs text-gray-500">
          初期値: 通常 {DEFAULT_COMPOSE_HEIGHT.desktopPx}px / モバイル{" "}
          {DEFAULT_COMPOSE_HEIGHT.mobilePx}px
        </p>
        <Button type="button" variant="outline" size="sm" onClick={resetHeight}>
          高さをデフォルトに戻す
        </Button>
      </div>

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
