import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { UserListResponse } from "@/app/_types/users";
import { calculateRating, getColorFromScore } from "@/lib/rating";

// エッジランタイムとキャッシュを維持
export const revalidate = 60; // 1分間キャッシュ

// レート計算のキャッシュを追加
const CACHE_TTL = 60 * 60 * 1000; // 1時間
const rateCache = new Map<string, { rate: number; timestamp: number }>();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "rate";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 5;
    const skip = (page - 1) * limit;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // レート順の場合はインデックスを活用
    const orderBy =
      sort === "rate" ? { rate: "desc" as const } : { [sort]: "desc" as const };

    // 必要な情報のみを1回のクエリで取得
    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        take: limit,
        skip: skip,
        orderBy,
        select: {
          id: true,
          username: true,
          icon: true,
          rate: true,
          postCount: true,
          createdAt: true,
          followersCount: true, // スキーマに定義された列を使用
          followingCount: true, // スキーマに定義された列を使用
        },
      }),
      prisma.user.count(),
    ]);

    // フォロー状態を取得（認証済みユーザーのみ）
    let followMap: { [key: string]: boolean } = {};
    if (userId) {
      const follows = await prisma.follow.findMany({
        where: {
          followerId: userId,
          followedId: { in: users.map((u) => u.id) },
        },
        select: { followedId: true },
      });

      followMap = follows.reduce((acc: { [key: string]: boolean }, f) => {
        acc[f.followedId] = true;
        return acc;
      }, {});
    }

    // レスポンスの整形
    const formattedUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      icon: user.icon,
      rate: user.rate,
      postCount: user.postCount,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      createdAt: user.createdAt,
      isFollowing: userId ? !!followMap[user.id] : false,
      ratingColor: getColorFromScore(user.rate),
    }));

    const totalPages = Math.ceil(totalUsers / limit);
    const hasMore = page * limit < totalUsers;

    // クライアントが期待するページネーション形式に合わせた構造
    const response = {
      users: formattedUsers,
      total: totalUsers,
      nextCursor: hasMore ? String(page + 1) : undefined,
      // ページネーション情報を追加
      pagination: {
        total: totalUsers,
        pages: totalPages,
        current: page,
        hasMore: hasMore,
      },
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
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
