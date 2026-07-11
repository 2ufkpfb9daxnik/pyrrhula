import { describe, it, expect } from "vitest";
import { getPowerPaginationPages } from "./power-pagination";

describe("getPowerPaginationPages", () => {
  it("returns a single page when total is 1", () => {
    expect(getPowerPaginationPages(1, 1)).toEqual([1]);
  });

  it("returns all pages when total is small", () => {
    expect(getPowerPaginationPages(3, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("shows first, last, current, then positive offsets on page 1", () => {
    expect(getPowerPaginationPages(1, 100)).toEqual([
      1, 2, 3, 5, 9, 17, 33, 65, 100,
    ]);
  });

  it("uses symmetric power offsets around the current page", () => {
    expect(getPowerPaginationPages(8, 13)).toEqual([
      1, 4, 6, 7, 8, 9, 10, 12, 13,
    ]);
  });

  it("caps visible pages at 10 for large totals", () => {
    expect(getPowerPaginationPages(100, 1000)).toEqual([
      1, 92, 96, 98, 99, 100, 101, 102, 104, 1000,
    ]);
  });

  it("ignores invalid total page counts", () => {
    expect(getPowerPaginationPages(1, Number.NaN)).toEqual([1]);
  });
});
