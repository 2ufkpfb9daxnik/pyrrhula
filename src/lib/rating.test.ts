import { describe, it, expect } from "vitest";
import {
  calculateRating,
  getColorFromScore,
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
  it("maps score ranges to colors", () => {
    expect(getColorFromScore(0)).toBe("text-gray-300");
    expect(getColorFromScore(100)).toBe("text-gray-500");
    expect(getColorFromScore(5000)).toContain("gradient");
  });

  it("handles null safely", () => {
    expect(getColorFromScore(null)).toBe("text-gray-300");
  });
});

describe("RATING_DELTAS", () => {
  it("has positive deltas for engagement actions", () => {
    expect(RATING_DELTAS.POST_CREATED).toBeGreaterThan(0);
    expect(RATING_DELTAS.NEW_FOLLOWER).toBeGreaterThan(0);
  });
});
