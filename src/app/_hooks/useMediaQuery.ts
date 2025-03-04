import { useState, useEffect } from "react";

/**
 * メディアクエリの結果に応じてブール値を返すReactフック
 * @param query メディアクエリ文字列（例: "(max-width: 768px)"）
 * @returns メディアクエリがマッチするかどうかのブール値
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // SSR環境ではwindowが存在しないため早期リターン
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);
    const updateMatch = () => setMatches(media.matches);

    // 初期値設定
    updateMatch();

    // イベントリスナー登録（ブラウザ互換性対応）
    if (media.addEventListener) {
      // 最新のブラウザ向け
      media.addEventListener("change", updateMatch);
      return () => media.removeEventListener("change", updateMatch);
    } else {
      // 古いブラウザ互換性のため（Safari 13.1以前など）
      media.addListener(updateMatch);
      return () => media.removeListener(updateMatch);
    }
  }, [query]);

  return matches;
}

export default useMediaQuery;
