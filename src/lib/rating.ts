import prisma from "./prisma";
import type { RatingColor } from "@/app/_types/rating";

export async function createRatingHistory(
  userId: string,
  delta: number,
  newRating: number,
  reason: string,
) {
  try {
    await prisma.$executeRaw`
      INSERT INTO rating_history (id, user_id, delta, rating, created_at, reason)
      VALUES (gen_random_uuid(), ${userId}, ${delta}, ${newRating}, NOW(), ${reason})
    `;
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

export function getColorFromScore(
  score: number | null | undefined,
): RatingColor {
  const normalizedScore = Number.isFinite(score)
    ? Math.max(0, score as number)
    : 0;

  if (normalizedScore >= 5000) {
    return "bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500";
  }
  if (normalizedScore >= 4000) {
    return "text-red-500";
  }
  if (normalizedScore >= 3200) {
    return "text-orange-500";
  }
  if (normalizedScore >= 2500) {
    return "text-yellow-500";
  }
  if (normalizedScore >= 1900) {
    return "text-purple-500";
  }
  if (normalizedScore >= 1400) {
    return "text-blue-500";
  }
  if (normalizedScore >= 1000) {
    return "text-cyan-500";
  }
  if (normalizedScore >= 700) {
    return "text-green-500";
  }
  if (normalizedScore >= 450) {
    return "text-lime-500";
  }
  if (normalizedScore >= 250) {
    return "text-amber-700";
  }
  if (normalizedScore >= 80) {
    return "text-gray-500";
  }

  return "text-gray-300";
}
