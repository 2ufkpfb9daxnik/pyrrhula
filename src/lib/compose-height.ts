export type ComposeHeightPrefs = {
  /** サイドバーなど通常の投稿フォーム（px） */
  desktopPx: number;
  /** モバイルの投稿ダイアログ（px） */
  mobilePx: number;
};

/** Tailwind min-h-24 / min-h-72 に相当 */
export const DEFAULT_COMPOSE_HEIGHT: ComposeHeightPrefs = {
  desktopPx: 96,
  mobilePx: 288,
};

export const COMPOSE_HEIGHT_STORAGE_KEY = "pyrrhula-compose-height";

export const COMPOSE_HEIGHT_MIN = 60;
export const COMPOSE_HEIGHT_MAX = 800;

export function clampComposeHeight(px: number): number {
  if (!Number.isFinite(px)) return DEFAULT_COMPOSE_HEIGHT.desktopPx;
  return Math.min(
    COMPOSE_HEIGHT_MAX,
    Math.max(COMPOSE_HEIGHT_MIN, Math.round(px)),
  );
}

export function parseComposeHeightPrefs(
  raw: string | null,
): ComposeHeightPrefs {
  if (!raw) return { ...DEFAULT_COMPOSE_HEIGHT };
  try {
    const parsed = JSON.parse(raw) as Partial<ComposeHeightPrefs>;
    return {
      desktopPx: clampComposeHeight(
        parsed.desktopPx ?? DEFAULT_COMPOSE_HEIGHT.desktopPx,
      ),
      mobilePx: clampComposeHeight(
        parsed.mobilePx ?? DEFAULT_COMPOSE_HEIGHT.mobilePx,
      ),
    };
  } catch {
    return { ...DEFAULT_COMPOSE_HEIGHT };
  }
}
