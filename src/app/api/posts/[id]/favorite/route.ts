import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { FavoriteListResponse } from "@/app/_types/favorite";
import { createRatingHistory, RATING_REASONS } from "@/lib/rating";

// お気に入りした人一覧を取得
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 20;

    // 投稿の存在確認
    const post = await prisma.post.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // お気に入りしたユーザー一覧を取得
    const favorites = await prisma.favorite.findMany({
      where: {
        postId: params.id,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
      },
    });

    // 次ページの有無を確認
    const hasMore = favorites.length > limit;
    const nextCursor = hasMore ? favorites[limit - 1].id : undefined;
    const favoriteList = hasMore ? favorites.slice(0, -1) : favorites;

    // レスポンスデータの整形
    const response: FavoriteListResponse = {
      users: favoriteList.map((favorite) => ({
        id: favorite.user.id,
        username: favorite.user.username,
        icon: favorite.user.icon,
        createdAt: favorite.createdAt,
      })),
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Favorite List Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 投稿をお気に入りする
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 投稿の存在確認
    const post = await prisma.post.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // トランザクションでお気に入りと通知を作成し、カウントとレートを更新
    const result = await prisma.$transaction(async (prisma) => {
      // 1. お気に入りを作成
      const favorite = await prisma.favorite.create({
        data: {
          postId: params.id,
          userId: session.user.id,
        },
      });

      // 2. 通知を作成
      await prisma.notification.create({
        data: {
          type: "fav",
          senderId: session.user.id,
          receiverId: post.userId,
          relatedPostId: params.id,
        },
      });

      // 3. お気に入り数を増やす
      await prisma.post.update({
        where: { id: params.id },
        data: {
          favorites: {
            increment: 1,
          },
        },
      });

      // 4. レート計算に必要な情報を取得
      const [recentFavorites, totalFavorites, user] = await Promise.all([
        // 過去30日のお気に入り数
        prisma.favorite.count({
          where: {
            userId: session.user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        // 総お気に入り数
        prisma.favorite.count({
          where: {
            userId: session.user.id,
          },
        }),
        // ユーザー情報
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { rate: true },
        }),
      ]);

      // 5. レート計算
      const favoriteBonus = Math.floor(
        Math.sqrt(recentFavorites) * 8 + Math.sqrt(totalFavorites) * 5
      );
      const newRate = (user?.rate || 0) + favoriteBonus;

      // 6. レート履歴を記録
      if (user) {
        const delta = favoriteBonus;
        await createRatingHistory(
          session.user.id,
          delta,
          newRate,
          RATING_REASONS.POST_FAVORITED
        );
      }

      // 7. ユーザーのレートを更新
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          rate: newRate,
        },
      });

      return favorite;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // ユニーク制約違反（既にお気に入り済み）
    if ((error as any).code === "P2002") {
      return NextResponse.json({ error: "Already favorited" }, { status: 409 });
    }

    console.error("[Favorite Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
