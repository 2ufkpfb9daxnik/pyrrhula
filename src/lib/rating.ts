import type { RatingColor } from "@/app/_types/rating";

// スコアから色を決定する関数
export function getColorFromScore(score: number): RatingColor {
  if (score >= 65536)
    return "bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500";
  if (score >= 32768) return "text-red-500";
  if (score >= 16384) return "text-orange-500";
  if (score >= 8192) return "text-yellow-500";
  if (score >= 4096) return "text-purple-500";
  if (score >= 2048) return "text-blue-500";
  if (score >= 1024) return "text-cyan-500";
  if (score >= 512) return "text-green-500";
  if (score >= 256) return "text-lime-500";
  if (score >= 128) return "text-amber-700";
  if (score >= 64) return "text-gray-500";
  return "text-gray-300";
}

/**
 * 新しい計算式に基づいたレーティングを計算する関数
 * @param userData ユーザーデータのオブジェクト
 * @returns レーティングスコア
 */
export function calculateFullRating({
  recentPosts,
  totalPosts,
  recentReposts,
  totalReposts,
  recentFavoritesReceived,
  favoritesReceived,
  followersCount,
  accountAgeDays,
}: {
  recentPosts: number;
  totalPosts: number;
  recentReposts: number;
  totalReposts: number;
  recentFavoritesReceived: number;
  favoritesReceived: number;
  followersCount: number;
  accountAgeDays: number;
}): number {
  return Math.floor(
    recentPosts * 10 + // 直近30日の投稿数 × 10
      Math.sqrt(totalPosts) * 15 + // 過去の投稿の平方根 × 15
      recentReposts * 5 + // 直近30日の拡散数 × 5
      Math.sqrt(totalReposts) * 7 + // 総拡散数の平方根 × 7
      Math.sqrt(recentFavoritesReceived) * 8 + // 直近30日のお気に入り数の平方根 × 8
      Math.sqrt(favoritesReceived) * 5 + // 総お気に入り数の平方根 × 5
      Math.sqrt(followersCount) * 10 + // フォロワー数の平方根 × 10
      Math.log(accountAgeDays + 1) * 5 // アカウント作成からの日数（対数） × 5
  );
}

/**
 * 基本的な投稿数のみからレーティング色を計算する関数（後方互換性のために維持）
 * 新しい計算式に基づいて色を決定する
 */
export function calculateRating(
  recentPosts: number,
  totalPosts: number
): RatingColor {
  // 残りのデータがない場合は、最小限のデータで簡易計算
  const baseScore = recentPosts * 10 + Math.sqrt(totalPosts) * 15;

  // 簡易評価のため、基本スコアの2倍程度の値を返す（他のボーナスを概算）
  const estimatedFullScore = baseScore * 2;

  return getColorFromScore(estimatedFullScore);
}

/**
 * レーティング色とスコアを計算する関数
 * @returns レーティング色とスコア
 */
export function calculateRatingAndScore({
  recentPosts,
  totalPosts,
  recentReposts,
  totalReposts,
  recentFavoritesReceived,
  favoritesReceived,
  followersCount,
  accountAgeDays,
}: {
  recentPosts: number;
  totalPosts: number;
  recentReposts: number;
  totalReposts: number;
  recentFavoritesReceived: number;
  favoritesReceived: number;
  followersCount: number;
  accountAgeDays: number;
}): { color: RatingColor; score: number } {
  const score = calculateFullRating({
    recentPosts,
    totalPosts,
    recentReposts,
    totalReposts,
    recentFavoritesReceived,
    favoritesReceived,
    followersCount,
    accountAgeDays,
  });

  return {
    score,
    color: getColorFromScore(score),
  };
}
