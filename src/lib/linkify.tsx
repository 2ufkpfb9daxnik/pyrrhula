import React from "react";
import Link from "next/link";

// URL とハッシュタグのパターンを定義
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const HASHTAG_PATTERN =
  /#[\w\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]+/g;

export function linkify(text: string): React.ReactNode[] {
  if (!text) {
    return [];
  }

  const safeText = String(text);

  // テキストをURLとハッシュタグで分割
  const segments = safeText.split(
    new RegExp(`(${URL_PATTERN.source}|${HASHTAG_PATTERN.source})`, "g")
  );

  return segments.map((segment, i) => {
    if (!segment) {
      return "";
    }

    // URLの場合
    if (segment.match(URL_PATTERN)) {
      return (
        <a
          key={`url-${i}`}
          href={segment}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-blue-400 hover:text-blue-300 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {segment}
        </a>
      );
    }

    // ハッシュタグの場合
    if (segment.match(HASHTAG_PATTERN)) {
      return (
        <Link
          key={`hashtag-${i}`}
          href={`/search?q=${encodeURIComponent(segment)}`}
          className="text-blue-400 hover:text-blue-300 hover:underline"
          onClick={(e) => e.stopPropagation()}
          prefetch={false}
        >
          {segment}
        </Link>
      );
    }

    // 通常のテキストの場合
    return segment;
  });
}
