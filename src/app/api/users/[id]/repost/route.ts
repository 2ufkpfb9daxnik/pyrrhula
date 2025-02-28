// users/[id]/repost          GET                 そのユーザーが拡散している投稿取得
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserRepostsResponse } from "@/app/_types/post";

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

    // 拡散した投稿を取得
    const repostRelations = await prisma.repost.findMany({
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
    const hasMore = repostRelations.length > limit;
    const nextCursor = hasMore ? repostRelations[limit - 1].id : undefined;
    const repostList = hasMore ? repostRelations.slice(0, -1) : repostRelations;

    // レスポンスデータの整形
    const response: UserRepostsResponse = {
      reposts: repostList.map((repost) => ({
        id: repost.post.id,
        content: repost.post.content,
        createdAt: repost.post.createdAt,
        favorites: repost.post.favorites,
        reposts: repost.post.reposts,
        user: repost.post.user,
        repostedAt: repost.createdAt,
      })),
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[User Reposts Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
