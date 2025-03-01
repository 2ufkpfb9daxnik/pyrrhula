import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateRating } from "@/lib/rating";
import { authOptions } from "@/lib/auth";
import type { UserRating } from "@/app/_types/rating";
// Prisma クライアントから Prisma 名前空間をインポート
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userIds } = await req.json();

    // リクエストの検証
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: userIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // 一度に処理する最大ユーザー数を制限
    const MAX_BATCH_SIZE = 50;
    const limitedUserIds = userIds.slice(0, MAX_BATCH_SIZE);

    console.log(
      `[Batch Rating] リクエスト: ${limitedUserIds.length}件のレーティングを取得`
    );

    // ユーザー情報とレーティングを取得
    const users = await prisma.user.findMany({
      where: {
        id: { in: limitedUserIds },
      },
      select: {
        id: true,
        postCount: true,
        createdAt: true,
      },
    });

    // 投稿数の取得 (30日以内)
    const recentPostsData = await prisma.post.groupBy({
      by: ["userId"],
      where: {
        userId: { in: limitedUserIds },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
        },
      },
      _count: {
        id: true,
      },
    });

    // 拡散数の取得
    const repostsData = await prisma.repost.groupBy({
      by: ["userId"],
      where: {
        userId: { in: limitedUserIds },
      },
      _count: {
        id: true,
      },
    });

    // 最近の拡散数の取得 (30日以内)
    const recentRepostsData = await prisma.repost.groupBy({
      by: ["userId"],
      where: {
        userId: { in: limitedUserIds },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
        },
      },
      _count: {
        id: true,
      },
    });

    // お気に入り数 (受け取り) の取得
    // SQLテンプレートリテラルの修正 - Prisma.join() を使用
    const favoritesReceivedData = await prisma.$queryRaw`
      SELECT p."userId", COUNT(*) as count 
      FROM "Favorite" f 
      JOIN "Post" p ON f."postId" = p.id 
      WHERE p."userId" IN (${Prisma.join(limitedUserIds)}) 
      GROUP BY p."userId"
    `;

    // フォロワー数の取得
    const followersData = await prisma.follow.groupBy({
      by: ["followedId"],
      where: {
        followedId: { in: limitedUserIds },
      },
      _count: {
        followerId: true,
      },
    });

    // データ構造化
    const result: Record<string, UserRating> = {};

    // 各ユーザーに対してレーティングを計算
    for (const user of users) {
      // 最近の投稿数
      const recentPostsItem = recentPostsData.find(
        (item) => item.userId === user.id
      );
      const recentPosts = recentPostsItem ? recentPostsItem._count.id : 0;

      // 総投稿数 (データベースに保存されている値を使用)
      const totalPosts = user.postCount || 0;

      // 拡散数
      const repostsItem = repostsData.find((item) => item.userId === user.id);
      const totalReposts = repostsItem ? repostsItem._count.id : 0;

      // 最近の拡散数
      const recentRepostsItem = recentRepostsData.find(
        (item) => item.userId === user.id
      );
      const recentReposts = recentRepostsItem ? recentRepostsItem._count.id : 0;

      // お気に入り数
      const favoritesReceivedItem = (favoritesReceivedData as any[]).find(
        (item) => item.userId === user.id
      );
      const favoritesReceived = favoritesReceivedItem
        ? Number(favoritesReceivedItem.count)
        : 0;

      // フォロワー数
      const followersItem = followersData.find(
        (item) => item.followedId === user.id
      );
      const followersCount = followersItem
        ? followersItem._count.followerId
        : 0;

      // レーティングカラーの計算
      const color = calculateRating(recentPosts, totalPosts);

      // レスポンス用のレーティングデータを構築
      result[user.id] = {
        color,
        recentPostCount: recentPosts,
        totalPostCount: totalPosts,
        score:
          totalPosts * 10 +
          recentPosts * 20 +
          totalReposts * 5 +
          recentReposts * 10 +
          Math.sqrt(favoritesReceived) * 15 +
          Math.sqrt(followersCount) * 20,
      };
    }

    console.log(
      `[Batch Rating] 完了: ${Object.keys(result).length}件のレーティングを返却`
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Batch Rating Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch ratings" },
      { status: 500 }
    );
  }
}
