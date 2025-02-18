// users/[id]/reply          GET                 そのユーザーがリプライしている投稿取得
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserRepliesResponse } from "@/app/_types/post";

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

    // リプライした投稿を取得
    const replies = await prisma.post.findMany({
      where: {
        userId: params.id,
        parentId: { not: null }, // 親投稿が存在する投稿のみ
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
        parent: {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // 次ページの有無を確認
    const hasMore = replies.length > limit;
    const nextCursor = hasMore ? replies[limit - 1].id : undefined;
    const replyList = hasMore ? replies.slice(0, -1) : replies;

    const response: UserRepliesResponse = {
      replies: replyList,
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[User Replies Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
