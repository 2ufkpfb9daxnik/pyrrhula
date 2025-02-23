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
  if (score >= 1000) return "text-red-500";
  if (score >= 500) return "text-orange-500";
  if (score >= 250) return "text-yellow-500";
  if (score >= 125) return "text-purple-500";
  if (score >= 55) return "text-blue-500";
  if (score >= 45) return "text-cyan-500";
  if (score >= 35) return "text-green-500";
  if (score >= 25) return "text-lime-500";
  if (score >= 15) return "text-amber-700";
  if (score >= 5) return "text-gray-500";
  return "text-gray-300";
}
