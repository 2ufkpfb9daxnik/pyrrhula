import { describe, it, expect } from "vitest";
import {
  calculateRating,
  getColorFromScore,
  formatRatingColorClass,
  RATING_COLOR_TIERS,
  RATING_DELTAS,
} from "@/lib/rating";

describe("calculateRating", () => {
  it("returns higher score for more active users", () => {
    const low = calculateRating({
      recentPosts: 1,
      totalPosts: 1,
      recentReposts: 0,
      totalReposts: 0,
      recentFavoritesReceived: 0,
      favoritesReceived: 0,
      followersCount: 0,
      accountAgeDays: 1,
    });

    const high = calculateRating({
      recentPosts: 30,
      totalPosts: 100,
      recentReposts: 10,
      totalReposts: 50,
      recentFavoritesReceived: 20,
      favoritesReceived: 80,
      followersCount: 25,
      accountAgeDays: 365,
    });

    expect(high).toBeGreaterThan(low);
  });

  it("uses expected weight for recent posts", () => {
    const score = calculateRating({
      recentPosts: 3,
      totalPosts: 0,
      recentReposts: 0,
      totalReposts: 0,
      recentFavoritesReceived: 0,
      favoritesReceived: 0,
      followersCount: 0,
      accountAgeDays: 1,
    });

    expect(score).toBeGreaterThanOrEqual(3 * 10);
  });
});

describe("getColorFromScore", () => {
  it("maps score ranges to colors (64 base, doubling tiers)", () => {
    expect(getColorFromScore(0)).toBe("text-gray-300");
    expect(getColorFromScore(64)).toBe("text-gray-300");
    expect(getColorFromScore(65)).toBe("text-gray-500");
    expect(getColorFromScore(2640)).toBe("text-blue-500");
    expect(getColorFromScore(8193)).toBe("text-yellow-500");
    expect(getColorFromScore(32769)).toBe("text-red-500");
  });

  it("handles null safely", () => {
    expect(getColorFromScore(null)).toBe("text-gray-300");
  });
});

describe("formatRatingColorClass", () => {
  it("adds clip styles for gradient colors", () => {
    const gradient =
      "bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500";
    expect(formatRatingColorClass(gradient)).toContain("bg-clip-text");
  });

  it("leaves solid colors unchanged", () => {
    expect(formatRatingColorClass("text-yellow-500")).toBe("text-yellow-500");
  });
});

describe("RATING_COLOR_TIERS", () => {
  it("is ordered from highest threshold to lowest", () => {
    for (let i = 1; i < RATING_COLOR_TIERS.length; i += 1) {
      expect(RATING_COLOR_TIERS[i - 1].minScore).toBeGreaterThan(
        RATING_COLOR_TIERS[i].minScore,
      );
    }
  });

  it("starts at 64 and doubles up to red at 32769", () => {
    expect(RATING_COLOR_TIERS.at(-1)?.rangeLabel).toBe("64点以下");
    expect(RATING_COLOR_TIERS[0].minScore).toBe(32769);
    expect(RATING_COLOR_TIERS[0].label).toBe("赤");
  });
});

describe("RATING_DELTAS", () => {
  it("has positive deltas for engagement actions", () => {
    expect(RATING_DELTAS.POST_CREATED).toBeGreaterThan(0);
    expect(RATING_DELTAS.NEW_FOLLOWER).toBeGreaterThan(0);
  });
});
