import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { UserListResponse } from "@/app/_types/users";
import { calculateRating } from "@/lib/rating";

// エッジランタイムとキャッシュを維持
export const runtime = "edge";
export const revalidate = 60; // 1分間キャッシュ

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "rate";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const skip = (page - 1) * limit;

    // Prismaクエリを最適化
    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        take: limit,
        skip: skip,
        orderBy: {
          [sort]: "desc",
        },
        select: {
          id: true,
          username: true,
          icon: true,
          rate: true,
          postCount: true,
          createdAt: true,
          // 投稿数を直接集計
          _count: {
            select: {
              posts: {
                where: {
                  createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  },
                },
              },
            },
          },
        },
      }),
      prisma.user.count(),
    ]);

    // レスポンスの整形を最適化
    const formattedUsers = users.map((user) => ({
      ...user,
      ratingColor: calculateRating(user._count.posts, user.postCount),
    }));

    const response: UserListResponse = {
      users: formattedUsers,
      hasMore: page * limit < totalUsers,
      nextCursor: page * limit < totalUsers ? String(page + 1) : undefined,
    };

    // キャッシュヘッダーを追加
    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("[Users Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
