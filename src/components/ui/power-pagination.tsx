"use client";

import { Button } from "@/components/ui/button";

interface PowerPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PowerPagination({
  currentPage,
  totalPages,
  onPageChange,
}: PowerPaginationProps) {
  const generatePages = () => {
    const pages = new Set<number>();

    // 常に1ページ目と最終ページを表示
    pages.add(1);
    if (totalPages > 1) {
      pages.add(totalPages);
    }

    // 現在のページを追加
    pages.add(currentPage);

    // 前後のページを必ず表示（存在する場合）
    if (currentPage > 1) {
      pages.add(currentPage - 1);
    }
    if (currentPage < totalPages) {
      pages.add(currentPage + 1);
    }

    // 少し離れたページも表示（前後2-3ページ）
    if (currentPage > 3) {
      pages.add(currentPage - 2);
      pages.add(currentPage - 3);
    }
    if (currentPage < totalPages - 2) {
      pages.add(currentPage + 2);
      pages.add(currentPage + 3);
    }

    // 2のべき乗ページを追加
    let power = 4; // 開始を4（2^2）から
    while (currentPage - power >= 1) {
      pages.add(currentPage - power);
      power *= 2;
    }

    power = 4; // 開始を4（2^2）から
    while (currentPage + power <= totalPages) {
      pages.add(currentPage + power);
      power *= 2;
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const pages = generatePages();

  // 省略記号の代わりに表示するための少数のページを選択
  const selectVisiblePages = (allPages: number[]): number[] => {
    // ページ数が20以下なら全て表示
    if (allPages.length <= 20) {
      return allPages;
    }

    // 20ページを超える場合は、必須ページとべき乗ページを選択
    const result: number[] = [];

    // 必須ページ：1, currentPage-1, currentPage, currentPage+1, totalPages
    const mustIncludePages = new Set(
      [1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(
        (p) => p >= 1 && p <= totalPages
      )
    );

    for (const page of allPages) {
      // 必須ページは常に含める
      if (mustIncludePages.has(page)) {
        result.push(page);
        continue;
      }

      // 2のべき乗の差があるページを選ぶ（例：128, 64, 32, 16, 8, 4, 2, 1）
      const distanceToCurrent = Math.abs(page - currentPage);
      const isPowerOfTwo = (num: number): boolean => {
        if (num <= 0) return false;
        return (num & (num - 1)) === 0;
      };

      if (isPowerOfTwo(distanceToCurrent) || isPowerOfTwo(page)) {
        result.push(page);
      }
      // 現在のページの近くのページは優先して表示（追加のページ）
      else if (distanceToCurrent <= 5) {
        result.push(page);
      }
    }

    return [...new Set(result)].sort((a, b) => a - b);
  };

  // 表示するページを選択
  const visiblePages = selectVisiblePages(pages);

  return (
    <div className="flex flex-wrap justify-center gap-2 pt-4">
      {/* 前へボタン */}
      {currentPage > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          className="min-w-[40px]"
        >
          ←
        </Button>
      )}

      {/* ページボタン */}
      {visiblePages.map((page, index) => (
        <>
          {/* 省略記号を表示（大きな隙間がある場合） */}
          {index > 0 && visiblePages[index] - visiblePages[index - 1] > 1 && (
            <span
              key={`ellipsis-${index}`}
              className="flex items-center px-2 text-gray-500"
            >
              ...
            </span>
          )}
          <Button
            key={`page-${page}`}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className={`min-w-[40px] ${
              page === currentPage - 1 || page === currentPage + 1
                ? "border-primary/30"
                : ""
            }`}
          >
            {page}
          </Button>
        </>
      ))}

      {/* 次へボタン */}
      {currentPage < totalPages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          className="min-w-[40px]"
        >
          →
        </Button>
      )}
    </div>
  );
}
