export interface AppThemeColors {
  background: string;
  postBackground: string;
  postText: string;
  postBorder: string;
  mutedText: string;
  navIcon: string;
  postHover: string;
  actionIcon: string;
}

export const DEFAULT_APP_THEME: AppThemeColors = {
  background: "#000000",
  postBackground: "#000000",
  postText: "#ffffff",
  postBorder: "#262626",
  mutedText: "#737373",
  navIcon: "#ffffff",
  postHover: "#1f1f1f",
  actionIcon: "#a3a3a3",
};

export const APP_THEME_STORAGE_KEY = "pyrrhula-app-theme";

export const THEME_COLOR_FIELDS: {
  key: keyof AppThemeColors;
  label: string;
}[] = [
  { key: "background", label: "背景色" },
  { key: "postBackground", label: "投稿の背景色" },
  { key: "postText", label: "投稿の文字色" },
  { key: "postBorder", label: "投稿の区切り線" },
  { key: "mutedText", label: "補助テキスト（@id・日時など）" },
  { key: "navIcon", label: "ナビゲーションのアイコン" },
  { key: "postHover", label: "投稿ホバー時の背景" },
  { key: "actionIcon", label: "返信・拡散・いいねのアイコン" },
];

export function applyAppThemeToDocument(theme: AppThemeColors): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--app-bg", theme.background);
  root.style.setProperty("--app-post-bg", theme.postBackground);
  root.style.setProperty("--app-post-text", theme.postText);
  root.style.setProperty("--app-post-border", theme.postBorder);
  root.style.setProperty("--app-muted-text", theme.mutedText);
  root.style.setProperty("--app-nav-icon", theme.navIcon);
  root.style.setProperty("--app-post-hover", theme.postHover);
  root.style.setProperty("--app-action-icon", theme.actionIcon);
}
