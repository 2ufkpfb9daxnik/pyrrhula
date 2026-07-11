const MAX_VISIBLE_PAGES = 10;

function normalizePage(value: number, fallback: number): number {
  const page = Math.floor(Number(value));
  if (!Number.isFinite(page)) {
    return fallback;
  }
  return page;
}

export function getPowerPaginationPages(
  currentPage: number,
  totalPages: number,
): number[] {
  const total = Math.max(1, normalizePage(totalPages, 1));
  const current = Math.min(total, Math.max(1, normalizePage(currentPage, 1)));

  if (total <= 1) {
    return [1];
  }

  if (total <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const seen = new Set<number>();
  const pages: number[] = [];

  const addPage = (page: number): boolean => {
    if (page < 1 || page > total || seen.has(page)) {
      return false;
    }
    seen.add(page);
    pages.push(page);
    return true;
  };

  addPage(1);
  addPage(total);
  addPage(current);

  let offset = 1;
  while (pages.length < MAX_VISIBLE_PAGES) {
    let added = false;
    const below = current - offset;
    const above = current + offset;

    if (below >= 1) {
      added = addPage(below) || added;
    }

    if (pages.length >= MAX_VISIBLE_PAGES) {
      break;
    }

    if (above <= total) {
      added = addPage(above) || added;
    }

    if (!added) {
      break;
    }

    offset *= 2;
  }

  return pages.sort((a, b) => a - b);
}
