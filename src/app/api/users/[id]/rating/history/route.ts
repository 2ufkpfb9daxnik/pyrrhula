import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RatingHistoryRecord {
  delta: number;
  rating: number;
  created_at: Date;
  reason: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    // 対象ユーザーのレート履歴を取得
    const ratingHistory = await prisma.$queryRaw<RatingHistoryRecord[]>`
      SELECT delta, rating, created_at, reason
      FROM rating_history
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
    `;

    // レスポンスのデータ形式を合わせる
    const formattedHistory = ratingHistory.map((history) => ({
      delta: history.delta,
      rating: history.rating,
      createdAt: history.created_at,
      reason: history.reason,
    }));

    return NextResponse.json({ ratingHistory: formattedHistory });
  } catch (error) {
    console.error("Failed to fetch rating history:", error);
    return NextResponse.json(
      { error: "Failed to fetch rating history" },
      { status: 500 }
    );
  }
}
