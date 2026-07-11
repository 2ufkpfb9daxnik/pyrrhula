import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = (await params).id;

    const ratingHistory = await prisma.rating_history.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "asc" },
      select: {
        delta: true,
        rating: true,
        created_at: true,
        reason: true,
      },
    });

    const formattedHistory = ratingHistory.map((history) => ({
      delta: history.delta,
      rating: history.rating,
      createdAt: history.created_at?.toISOString() ?? new Date().toISOString(),
      reason: history.reason,
    }));

    return NextResponse.json({ ratingHistory: formattedHistory });
  } catch (error) {
    console.error("Failed to fetch rating history:", error);
    return NextResponse.json(
      { error: "Failed to fetch rating history" },
      { status: 500 },
    );
  }
}
