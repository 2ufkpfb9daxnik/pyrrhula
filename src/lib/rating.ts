import type { RatingColor } from "@/app/_types/rating";

export function calculateRating(
  recentPosts: number,
  totalPosts: number
): RatingColor {
  // 直近の投稿数と全体の投稿数から基本スコアを計算
  const recentScore = Math.min(recentPosts / 50, 1) * 70;
  const totalScore = Math.min(totalPosts / 1000, 1) * 30;
  const score = recentScore + totalScore;

  // スコアに基づいてレーティングカラーを決定
  if (score >= 200000) return "text-red-500";
  if (score >= 10000) return "text-orange-500";
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
