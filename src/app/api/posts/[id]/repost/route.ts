import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { RepostListResponse } from "@/app/_types/repost";
import { createRatingHistory, RATING_REASONS } from "@/lib/rating";

// 拡散した人一覧を取得
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

    // 拡散したユーザー一覧を取得
    const reposts = await prisma.repost.findMany({
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
      { status: 500 },
    );
  }
}

// 投稿を拡散する
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
    console.log(`[Repost] postId=${postId} currentUserId=${currentUserId}`);

    // 投稿の存在確認
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // トランザクションは短く保つ: 拡散作成と投稿カウント増分のみ
    const result = await prisma.$transaction(async (tx) => {
      const repost = await tx.repost.create({
        data: { postId, userId: currentUserId },
      });
      await tx.post.update({
        where: { id: postId },
        data: { reposts: { increment: 1 } },
      });
      return repost;
    });

    // トランザクション外で通知とレート更新（重い集計）を実行
    try {
      if (post.userId !== currentUserId) {
        await prisma.notification.create({
          data: {
            type: "rep",
            senderId: currentUserId,
            receiverId: post.userId,
            relatedPostId: postId,
          },
        });
      }

      const [recentReposts, totalReposts, user] = await Promise.all([
        prisma.repost.count({
          where: {
            userId: currentUserId,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.repost.count({ where: { userId: currentUserId } }),
        prisma.user.findUnique({
          where: { id: currentUserId },
          select: { rate: true },
        }),
      ]);

      const repostBonus = Math.floor(
        recentReposts * 5 + Math.sqrt(totalReposts) * 7,
      );
      const newRate = (user?.rate || 0) + repostBonus;

      if (user) {
        await createRatingHistory(
          currentUserId,
          repostBonus,
          newRate,
          RATING_REASONS.POST_REPOSTED,
        );
      }

      await prisma.user.update({
        where: { id: currentUserId },
        data: { rate: newRate },
      });
    } catch (postProcessError) {
      console.error("[Repost post-process error]:", postProcessError);
    }

    return NextResponse.json(result, { status: 201 });
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
    if (error instanceof Error) {
      console.error(error.stack);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
