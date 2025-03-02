import type { RatingColor } from "@/app/_types/rating";

// スコアから色を決定する関数
export function getColorFromScore(score: number): RatingColor {
  if (score >= 200000)
    return "bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500";
  if (score >= 30000) return "text-red-500";
  if (score >= 5000) return "text-orange-500";
  if (score >= 1000) return "text-yellow-500";
  if (score >= 250) return "text-purple-500";
  if (score >= 62) return "text-blue-500";
  if (score >= 31) return "text-cyan-500";
  if (score >= 15) return "text-green-500";
  if (score >= 7) return "text-lime-500";
  if (score >= 3) return "text-amber-700";
  if (score >= 1) return "text-gray-500";
  return "text-gray-300";
}

// 従来の関数は互換性のために残す
export function calculateRating(
  recentPosts: number,
  totalPosts: number
): RatingColor {
  // 直近30日の投稿数と全体の投稿数から基本スコアを計算
  const recentScore = Math.min(recentPosts / 50, 1) * 70;
  const totalScore = Math.min(totalPosts / 1000, 1) * 30;
  const score = recentScore + totalScore;

  return getColorFromScore(score);
}
