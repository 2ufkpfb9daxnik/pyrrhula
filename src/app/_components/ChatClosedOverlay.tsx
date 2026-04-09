"use client";

import React from "react";

export function ChatClosedOverlay({
  message = "チャットは閉鎖されています",
}: {
  message?: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {/* 背景領域: モバイルでは下部のナビ（h-16）を避け、デスクトップでは左側のナビ（w-16）を避ける */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-16 top-0 bg-black/60 md:bottom-0 md:left-16" />

      {/* モーダルコンテンツをナビ領域を避けた領域内で中央表示 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-16 top-0 flex items-center justify-center md:bottom-0 md:left-16">
        <div className="pointer-events-auto relative z-10 mx-4 max-w-lg rounded-lg bg-white p-6 text-center shadow-lg dark:bg-gray-900 dark:text-gray-100">
          <h2 className="text-lg font-bold">
            チャットは一時的に閉鎖されています
          </h2>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatClosedOverlay;
