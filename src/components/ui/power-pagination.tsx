"use client";

import { Button } from "@/components/ui/button";
import { getPowerPaginationPages } from "@/lib/power-pagination";

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
  const safeTotalPages = Math.max(1, Math.floor(Number(totalPages)) || 1);
  const safeCurrentPage = Math.min(
    safeTotalPages,
    Math.max(1, Math.floor(Number(currentPage)) || 1),
  );
  const visiblePages = getPowerPaginationPages(
    safeCurrentPage,
    safeTotalPages,
  );

  return (
    <div className="flex flex-wrap justify-center gap-2 pt-4">
      {safeCurrentPage > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          className="min-w-[40px]"
        >
          ←
        </Button>
      )}

      {visiblePages.map((page) => (
        <Button
          key={`page-${page}`}
          variant={page === safeCurrentPage ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
          className={`min-w-[40px] ${
            page === safeCurrentPage - 1 || page === safeCurrentPage + 1
              ? "border-primary/30"
              : ""
          }`}
        >
          {page}
        </Button>
      ))}

      {safeCurrentPage < safeTotalPages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          className="min-w-[40px]"
        >
          →
        </Button>
      )}
    </div>
  );
}
