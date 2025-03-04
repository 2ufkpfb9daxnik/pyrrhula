import React from "react";
import Link from "next/link";

// パターン定義
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const HASHTAG_PATTERN =
  /#[\w\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]+/g;
const MENTION_PATTERN = /@[\w]+/g;

export function linkify(text: string): React.ReactNode[] {
  if (!text) {
    return [];
  }

  const safeText = String(text);
  const result: React.ReactNode[] = [];

  // 最後に処理した位置を記録
  let lastIndex = 0;

  // 全てのパターンを組み合わせた正規表現
  const combinedPattern = new RegExp(
    `${URL_PATTERN.source}|${HASHTAG_PATTERN.source}|${MENTION_PATTERN.source}`,
    "g"
  );

  // マッチするたびに処理
  let match;
  while ((match = combinedPattern.exec(safeText)) !== null) {
    // マッチした位置の前にあるテキストを追加
    if (match.index > lastIndex) {
      result.push(safeText.substring(lastIndex, match.index));
    }

    const matchedText = match[0];

    // URLの場合
    if (matchedText.match(URL_PATTERN)) {
      result.push(
        <a
          key={`url-${match.index}`}
          href={matchedText}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-blue-400 hover:text-blue-300 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {matchedText}
        </a>
      );
    }
    // ハッシュタグの場合
    else if (matchedText.match(HASHTAG_PATTERN)) {
      result.push(
        <Link
          key={`hashtag-${match.index}`}
          href={`/search?q=${encodeURIComponent(matchedText)}`}
          className="text-blue-400 hover:text-blue-300 hover:underline"
          onClick={(e) => e.stopPropagation()}
          prefetch={false}
        >
          {matchedText}
        </Link>
      );
    }
    // メンションの場合
    else if (matchedText.match(MENTION_PATTERN)) {
      const username = matchedText.slice(1); // @を除去
      result.push(
        <Link
          key={`mention-${match.index}`}
          href={`/user/${username}`}
          className="text-blue-400 hover:text-blue-300 hover:underline"
          onClick={(e) => e.stopPropagation()}
          prefetch={false}
        >
          {matchedText}
        </Link>
      );
    }

    // 次の検索位置を更新
    lastIndex = combinedPattern.lastIndex;
  }

  // 残りのテキストを追加
  if (lastIndex < safeText.length) {
    result.push(safeText.substring(lastIndex));
  }

  return result;
}
