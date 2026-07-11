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

/** 最下位ティアの上限（この値以下は白） */
export const RATING_COLOR_BASE = 64;

/** レート色のしきい値（高い順）。64 から 2 倍ずつ上がり、赤は 32769 点以上 */
export const RATING_COLOR_TIERS = [
  {
    minScore: 32769,
    label: "赤",
    colorClass: "text-red-500",
    rangeLabel: "32769点以上",
  },
  {
    minScore: 16385,
    label: "橙",
    colorClass: "text-orange-500",
    rangeLabel: "16385〜32768点",
  },
  {
    minScore: 8193,
    label: "黄",
    colorClass: "text-yellow-500",
    rangeLabel: "8193〜16384点",
  },
  {
    minScore: 4097,
    label: "紫",
    colorClass: "text-purple-500",
    rangeLabel: "4097〜8192点",
  },
  {
    minScore: 2049,
    label: "青",
    colorClass: "text-blue-500",
    rangeLabel: "2049〜4096点",
  },
  {
    minScore: 1025,
    label: "水",
    colorClass: "text-cyan-500",
    rangeLabel: "1025〜2048点",
  },
  {
    minScore: 513,
    label: "緑",
    colorClass: "text-green-500",
    rangeLabel: "513〜1024点",
  },
  {
    minScore: 257,
    label: "黄緑",
    colorClass: "text-lime-500",
    rangeLabel: "257〜512点",
  },
  {
    minScore: 129,
    label: "茶",
    colorClass: "text-amber-700",
    rangeLabel: "129〜256点",
  },
  {
    minScore: 65,
    label: "灰",
    colorClass: "text-gray-500",
    rangeLabel: "65〜128点",
  },
  {
    minScore: 0,
    label: "白",
    colorClass: "text-gray-300",
    rangeLabel: "64点以下",
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

/** ユーザー名などに Tailwind の色クラスを適用する（虹色グラデーション対応） */
export function formatRatingColorClass(colorClass: string): string {
  if (colorClass.includes("gradient")) {
    return `${colorClass} bg-clip-text text-transparent`;
  }
  return colorClass;
}
