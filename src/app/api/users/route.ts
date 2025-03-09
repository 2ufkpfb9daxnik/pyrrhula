import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { UserListResponse } from "@/app/_types/users";
import { calculateRating, getColorFromScore } from "@/lib/rating";
import { Prisma } from "@prisma/client";

// エッジランタイムとキャッシュを維持
export const revalidate = 60; // 1分間キャッシュ

// レート計算のキャッシュを追加
const CACHE_TTL = 60 * 60 * 1000; // 1時間
const rateCache = new Map<string, { rate: number; timestamp: number }>();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // クエリパラメータの取得と検証
    const sort = searchParams.get("sort") || "rate";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "10"))
    );
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || ""; // 検索機能を追加

    // セッション情報の取得
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // 有効なソートフィールドかチェック
    const validSortFields = [
      "rate",
      "postCount",
      "followersCount",
      "followingCount",
      "createdAt",
    ];
    const actualSort = validSortFields.includes(sort) ? sort : "rate";

    // 検索条件の構築
    // Prismaの型に合わせて修正
    const whereCondition = search
      ? {
          OR: [
            {
              username: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              id: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {};

    // レート順の場合はインデックスを活用
    const orderBy = {
      [actualSort]: "desc" as const,
    };

    // 必要な情報のみを1回のクエリで取得
    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where: whereCondition,
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
          followersCount: true,
          followingCount: true,
          profile: true,
        },
      }),
      prisma.user.count({
        where: whereCondition,
      }),
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
      bio: user.profile || "",
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
        limit: limit,
      },
      // メタデータを追加
      meta: {
        searchTerm: search || null,
        sortBy: actualSort,
      },
    };

    // キャッシュヘッダーを最適化
    // 検索やユーザー固有の結果はキャッシュ時間を短くする
    const cacheMaxAge = search || userId ? 30 : 60;

    // キャッシュヘッダーを追加
    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=30`,
      },
    });
  } catch (error) {
    console.error("[Users Error]:", error);
    // エラーメッセージの詳細化（開発環境のみ）
    const errorDetails =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "リスト取得中にエラーが発生しました";

    return NextResponse.json(
      { error: "Internal server error", message: errorDetails },
      { status: 500 }
    );
  }
}
