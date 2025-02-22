import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateRating } from "@/lib/rating";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // 直近50件の投稿数を取得
    const recentPosts = await prisma.post.count({
      where: {
        userId: params.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
        },
      },
    });

    // 全体の投稿数を取得
    const totalPosts = await prisma.post.count({
      where: {
        userId: params.id,
      },
    });

    const ratingColor = calculateRating(recentPosts, totalPosts);

    return NextResponse.json({
      color: ratingColor,
      recentPostCount: recentPosts,
      totalPostCount: totalPosts,
    });
  } catch (error) {
    console.error("[Rating Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch rating" },
      { status: 500 }
    );
  }
}
