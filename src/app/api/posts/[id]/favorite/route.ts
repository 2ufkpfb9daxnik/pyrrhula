import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { FavoriteListResponse } from "@/app/_types/favorite";
import { createRatingHistory, RATING_REASONS } from "@/lib/rating";

// お気に入りした人一覧を取得
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 20;

    // 投稿の存在確認
    const post = await prisma.post.findUnique({
      where: { id: (await params).id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // お気に入りしたユーザー一覧を取得
    const favorites = await prisma.favorite.findMany({
      where: {
        postId: (await params).id,
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
      { status: 500 },
    );
  }
}

// 投稿をお気に入りする
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;
    if (!session?.user || !currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: postId } = await params;
    console.log(`[Favorite] postId=${postId} currentUserId=${currentUserId}`);

    // 投稿の存在確認
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // トランザクションは短く保つ: お気に入り作成と投稿カウント増分のみ
    const result = await prisma.$transaction(async (tx) => {
      const favorite = await tx.favorite.create({
        data: { postId, userId: currentUserId },
      });

      await tx.post.update({
        where: { id: postId },
        data: { favorites: { increment: 1 } },
      });

      return favorite;
    });

    // トランザクション外で通知とレート更新を行う（重い集計をここで実行）
    try {
      if (post.userId !== currentUserId) {
        await prisma.notification.create({
          data: {
            type: "fav",
            senderId: currentUserId,
            receiverId: post.userId,
            relatedPostId: postId,
          },
        });
      }

      const [recentFavorites, totalFavorites, user] = await Promise.all([
        prisma.favorite.count({
          where: {
            userId: currentUserId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.favorite.count({ where: { userId: currentUserId } }),
        prisma.user.findUnique({
          where: { id: currentUserId },
          select: { rate: true },
        }),
      ]);

      const favoriteBonus = Math.floor(
        Math.sqrt(recentFavorites) * 8 + Math.sqrt(totalFavorites) * 5,
      );
      const newRate = (user?.rate || 0) + favoriteBonus;

      if (user) {
        await createRatingHistory(
          currentUserId,
          favoriteBonus,
          newRate,
          RATING_REASONS.POST_FAVORITED,
        );
      }

      await prisma.user.update({
        where: { id: currentUserId },
        data: { rate: newRate },
      });
    } catch (postProcessError) {
      console.error("[Favorite post-process error]:", postProcessError);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // ユニーク制約違反（既にお気に入り済み）
    if ((error as any).code === "P2002") {
      return NextResponse.json({ error: "Already favorited" }, { status: 409 });
    }

    console.error("[Favorite Error]:", error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
