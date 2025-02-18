// users/[id]/favorite          GET                 そのユーザーのお気に入り投稿取得
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserFavoritePostsResponse } from "@/app/_types/favorite";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Number(searchParams.get("limit")) || 20;

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // お気に入りした投稿を取得
    const favorites = await prisma.favorite.findMany({
      where: {
        userId: params.id,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        post: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                icon: true,
              },
            },
          },
        },
      },
    });

    // 次ページの有無を確認
    const hasMore = favorites.length > limit;
    const nextCursor = hasMore ? favorites[limit - 1].id : undefined;
    const favoriteList = hasMore ? favorites.slice(0, -1) : favorites;

    // レスポンスデータの整形
    const response: UserFavoritePostsResponse = {
      posts: favoriteList.map((favorite) => ({
        id: favorite.post.id,
        content: favorite.post.content,
        createdAt: favorite.post.createdAt,
        favorites: favorite.post.favorites,
        reposts: favorite.post.reposts,
        user: favorite.post.user,
        favoritedAt: favorite.createdAt,
      })),
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[User Favorites Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
