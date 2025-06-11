import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { RepostListResponse } from "@/app/_types/repost";
import { createRatingHistory, RATING_REASONS } from "@/lib/rating";

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

    // トランザクションで拡散と通知を作成し、カウントとレートを更新
    const result = await prisma.$transaction(async (prisma) => {
      // 1. 拡散を作成
      const repost = await prisma.repost.create({
        data: {
          postId: params.id,
          userId: session.user.id,
        },
      });

      // 2. 通知を作成
      await prisma.notification.create({
        data: {
          type: "rep",
          senderId: session.user.id,
          receiverId: post.userId,
          relatedPostId: params.id,
        },
      });

      // 3. 拡散数を増やす
      await prisma.post.update({
        where: { id: params.id },
        data: {
          reposts: {
            increment: 1,
          },
        },
      });

      // 4. レート計算に必要な情報を取得
      const [recentReposts, totalReposts, user] = await Promise.all([
        // 過去30日の拡散数
        prisma.repost.count({
          where: {
            userId: session.user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        // 総拡散数
        prisma.repost.count({
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
      const repostBonus = Math.floor(
        recentReposts * 5 + Math.sqrt(totalReposts) * 7
      );
      const newRate = (user?.rate || 0) + repostBonus;

      // 6. レート履歴を記録
      if (user) {
        const delta = repostBonus;
        await createRatingHistory(
          session.user.id,
          delta,
          newRate,
          RATING_REASONS.POST_REPOSTED
        );
      }

      // 7. ユーザーのレートを更新
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          rate: newRate,
        },
      });

      return repost;
    });

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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
