import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { UserListResponse } from "@/app/_types/users";
import { calculateRating } from "@/lib/rating";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "rate";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    // 総ユーザー数を取得
    const totalUsers = await prisma.user.count();

    // ユーザー一覧を取得
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
        _count: {
          select: {
            posts: true,
          },
        },
        followers: session?.user
          ? {
              where: {
                followerId: session.user.id,
              },
              select: {
                followerId: true,
              },
            }
          : undefined,
      },
    });

    // 各ユーザーの直近の投稿数とレーティングを計算
    const formattedUsers = await Promise.all(
      users.map(async (user) => {
        // 直近30日の投稿数を取得
        const recentPosts = await prisma.post.count({
          where: {
            userId: user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
            },
          },
        });

        // レーティングカラーを計算
        const ratingColor = calculateRating(recentPosts, user._count.posts);

        return {
          id: user.id,
          username: user.username,
          icon: user.icon,
          rate: user.rate,
          postCount: user._count.posts,
          createdAt: user.createdAt,
          isFollowing: user.followers?.length > 0,
          ratingColor,
          recentPostCount: recentPosts,
        };
      })
    );

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
