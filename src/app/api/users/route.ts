import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { UserListResponse } from "@/app/_types/users";
import { calculateRating } from "@/lib/rating";

// キャッシュの設定を追加
export const runtime = "edge";
export const revalidate = 60; // 1分間キャッシュ

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "rate";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const skip = (page - 1) * limit;

    // 基本的なユーザー情報のみを取得
    const users = await prisma.user.findMany({
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
      },
    });

    // 総数のクエリを分離（パフォーマンス改善）
    const [totalUsers, recentPosts] = await Promise.all([
      prisma.user.count(),
      // 直近の投稿数は必要なユーザーのみ取得
      prisma.post.groupBy({
        by: ["userId"],
        where: {
          userId: {
            in: users.map((u) => u.id),
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: true,
      }),
    ]);

    const formattedUsers = users.map((user) => {
      const recentPostCount =
        recentPosts.find((p) => p.userId === user.id)?._count || 0;
      return {
        ...user,
        ratingColor: calculateRating(recentPostCount, user.postCount),
      };
    });

    const response: UserListResponse = {
      users: formattedUsers,
      hasMore: page * limit < totalUsers,
      nextCursor: page * limit < totalUsers ? String(page + 1) : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Users Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
