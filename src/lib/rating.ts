import prisma from "./prisma";
import type { RatingColor } from "@/app/_types/rating";

export async function createRatingHistory(
  userId: string,
  delta: number,
  newRating: number,
  reason: string,
) {
  try {
    await prisma.rating_history.create({
      data: {
        user_id: userId,
        delta,
        rating: newRating,
        reason,
      },
    });
  } catch (error) {
    console.error("Failed to create rating history:", error);
  }
}

// レート更新の理由に関する定数
export const RATING_REASONS = {
  POST_CREATED: "投稿の作成",
  POST_REPOSTED: "投稿の拡散",
  POST_FAVORITED: "投稿のお気に入り登録",
  NEW_FOLLOWER: "新しいフォロワー",
  ACCOUNT_AGE: "アカウント作成からの経過日数",
} as const;

// レート変動量の定数
export const RATING_DELTAS = {
  POST_CREATED: 2,
  POST_REPOSTED: 1,
  POST_FAVORITED: 1,
  NEW_FOLLOWER: 3,
  ACCOUNT_AGE: 1,
} as const;

export interface RatingInput {
  recentPosts: number;
  totalPosts: number;
  recentReposts: number;
  totalReposts: number;
  recentFavoritesReceived: number;
  favoritesReceived: number;
  followersCount: number;
  accountAgeDays: number;
}

export function calculateRating(input: RatingInput): number {
  return Math.floor(
    input.recentPosts * 10 +
      Math.sqrt(input.totalPosts) * 15 +
      input.recentReposts * 5 +
      Math.sqrt(input.totalReposts) * 7 +
      Math.sqrt(input.recentFavoritesReceived) * 8 +
      Math.sqrt(input.favoritesReceived) * 5 +
      Math.sqrt(input.followersCount) * 10 +
      Math.log(Math.max(1, input.accountAgeDays) + 1) * 5,
  );
}

/** レート色のしきい値（高い順）。アプリ全体でこの定義を参照する */
export const RATING_COLOR_TIERS = [
  {
    minScore: 5000,
    label: "虹",
    colorClass: "bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500",
    rangeLabel: "5000点以上",
  },
  {
    minScore: 4000,
    label: "赤",
    colorClass: "text-red-500",
    rangeLabel: "4000〜4999点",
  },
  {
    minScore: 3200,
    label: "橙",
    colorClass: "text-orange-500",
    rangeLabel: "3200〜3999点",
  },
  {
    minScore: 2500,
    label: "黄",
    colorClass: "text-yellow-500",
    rangeLabel: "2500〜3199点",
  },
  {
    minScore: 1900,
    label: "紫",
    colorClass: "text-purple-500",
    rangeLabel: "1900〜2499点",
  },
  {
    minScore: 1400,
    label: "青",
    colorClass: "text-blue-500",
    rangeLabel: "1400〜1899点",
  },
  {
    minScore: 1000,
    label: "水",
    colorClass: "text-cyan-500",
    rangeLabel: "1000〜1399点",
  },
  {
    minScore: 700,
    label: "緑",
    colorClass: "text-green-500",
    rangeLabel: "700〜999点",
  },
  {
    minScore: 450,
    label: "黄緑",
    colorClass: "text-lime-500",
    rangeLabel: "450〜699点",
  },
  {
    minScore: 250,
    label: "茶",
    colorClass: "text-amber-700",
    rangeLabel: "250〜449点",
  },
  {
    minScore: 80,
    label: "灰",
    colorClass: "text-gray-500",
    rangeLabel: "80〜249点",
  },
  {
    minScore: 0,
    label: "白",
    colorClass: "text-gray-300",
    rangeLabel: "79点以下",
  },
] as const;

export function getColorFromScore(
  score: number | null | undefined,
): RatingColor {
  const normalizedScore = Number.isFinite(score)
    ? Math.max(0, score as number)
    : 0;

  for (const tier of RATING_COLOR_TIERS) {
    if (normalizedScore >= tier.minScore) {
      return tier.colorClass as RatingColor;
    }
  }

  return "text-gray-300";
}
