import prisma from "./prisma";

export async function createRatingHistory(
  userId: string,
  delta: number,
  newRating: number,
  reason: string
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
