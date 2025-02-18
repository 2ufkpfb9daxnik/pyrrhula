// posts/[id]/favorite     GET/POST/DELETE     お気に入りした人取得/お気に入りする
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { FavoriteListResponse } from "@/app/_types/favorite";

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

    // トランザクションでお気に入りと通知を作成し、カウントを更新
    const [favorite, _, updatedPost] = await prisma.$transaction([
      // お気に入りを作成
      prisma.favorite.create({
        data: {
          postId: params.id,
          userId: session.user.id,
        },
      }),
      // 通知を作成
      prisma.notification.create({
        data: {
          type: "fav",
          senderId: session.user.id,
          receiverId: post.userId,
          relatedPostId: params.id,
        },
      }),
      // お気に入り数を増やす
      prisma.post.update({
        where: { id: params.id },
        data: {
          favorites: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json(favorite, { status: 201 });
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
