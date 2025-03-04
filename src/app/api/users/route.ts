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

    // レート順の場合はインデックスを活用
    const orderBy =
      sort === "rate"
        ? { rate: "desc" as const, id: "asc" as const } // 複合インデックス用
        : { [sort]: "desc" as const };

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
              followers: true, // フォロワー数を取得
            },
          },
        },
      }),
      prisma.user.count(),
    ]);

    // 各ユーザーに対して追加データを取得
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        // 拡散、お気に入りの情報を取得（重要なデータのみ）
        const [
          recentReposts,
          totalReposts,
          recentFavoritesReceived,
          favoritesReceived,
        ] = await Promise.all([
          // 過去30日の拡散数
          prisma.repost.count({
            where: {
              userId: user.id,
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          }),
          // 総拡散数
          prisma.repost.count({
            where: { userId: user.id },
          }),
          // 過去30日に受け取ったお気に入り
          prisma.favorite.count({
            where: {
              post: { userId: user.id },
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          }),
          // 総お気に入り数
          prisma.favorite.count({
            where: {
              post: { userId: user.id },
            },
          }),
        ]);

        // アカウント年齢（日数）を計算
        const accountAgeDays = Math.floor(
          (Date.now() - new Date(user.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        // 従来のレーティング色（互換性のため）
        const ratingColor = calculateRating(user._count.posts, user.postCount);

        // スコアの計算（新しい計算式に基づく）
        // すでに計算されたrateを使用するか、新たに計算する
        let calculatedScore = user.rate;
        if (calculatedScore === 0) {
          // 新たに計算する場合
          calculatedScore = Math.floor(
            user._count.posts * 10 + // 直近30日の投稿数 × 10
              Math.sqrt(user.postCount) * 15 + // 過去の投稿の平方根 × 15
              recentReposts * 5 + // 直近30日の拡散数 × 5
              Math.sqrt(totalReposts) * 7 + // 総拡散数の平方根 × 7
              Math.sqrt(recentFavoritesReceived) * 8 + // 直近30日のお気に入り数の平方根 × 8
              Math.sqrt(favoritesReceived) * 5 + // 総お気に入り数の平方根 × 5
              Math.sqrt(user._count.followers) * 10 + // フォロワー数の平方根 × 10
              Math.log(accountAgeDays + 1) * 5 // アカウント作成からの日数（対数） × 5
          );
        }

        return {
          ...user,
          ratingColor, // 互換性を維持するため元の関数で計算
          calculatedScore, // 新しく計算したスコア
          // 詳細な評価関連データ（デバッグやUIに使用可能）
          ratingDetails: {
            recentPosts: user._count.posts,
            totalPosts: user.postCount,
            recentReposts,
            totalReposts,
            recentFavoritesReceived,
            favoritesReceived,
            followersCount: user._count.followers,
            accountAgeDays,
          },
        };
      })
    );

    // レスポンスの整形を最適化
    const formattedUsers = enhancedUsers.map((user) => ({
      id: user.id,
      username: user.username,
      icon: user.icon,
      rate: user.calculatedScore, // 新しく計算したスコアを使用
      postCount: user.postCount,
      createdAt: user.createdAt,
      ratingColor: getColorFromScore(user.calculatedScore), // 新しいスコアに基づいて色を計算
      _count: user._count,
      // 必要に応じてratingDetailsを含める
      // ratingDetails: user.ratingDetails,
    }));

    const response: UserListResponse = {
      users: formattedUsers,
      hasMore: page * limit < totalUsers,
      total: totalUsers, // 総ユーザー数を追加
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
