// posts/[id]/repost       GET/POST/        拡散した人取得 / 拡散する
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { RepostListResponse } from "@/app/_types/repost";

// 拡散した人一覧を取得
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

    // 拡散したユーザー一覧を取得
    const reposts = await prisma.repost.findMany({
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
    const hasMore = reposts.length > limit;
    const nextCursor = hasMore ? reposts[limit - 1].id : undefined;
    const repostList = hasMore ? reposts.slice(0, -1) : reposts;

    // レスポンスデータの整形
    const response: RepostListResponse = {
      users: repostList.map((repost) => ({
        id: repost.user.id,
        username: repost.user.username,
        icon: repost.user.icon,
        createdAt: repost.createdAt,
      })),
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Repost List Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 投稿を拡散する
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

    // トランザクションで拡散と通知を作成し、カウントを更新
    const [repost, _, updatedPost] = await prisma.$transaction([
      // 拡散を作成
      prisma.repost.create({
        data: {
          postId: params.id,
          userId: session.user.id,
        },
      }),
      // 通知を作成
      prisma.notification.create({
        data: {
          type: "rep",
          senderId: session.user.id,
          receiverId: post.userId,
          relatedPostId: params.id,
        },
      }),
      // 拡散数を増やす
      prisma.post.update({
        where: { id: params.id },
        data: {
          reposts: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json(repost, { status: 201 });
  } catch (error) {
    // ユニーク制約違反（既に拡散済み）
    if (
      error instanceof Error &&
      "code" in error &&
      (error as any).code === "P2002"
    ) {
      return NextResponse.json({ error: "Already reposted" }, { status: 409 });
    }

    console.error("[Repost Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
