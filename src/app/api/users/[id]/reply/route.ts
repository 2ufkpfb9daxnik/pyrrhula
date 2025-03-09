// users/[id]/reply          GET                 そのユーザーが返信している投稿取得
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
    const session = await getServerSession(authOptions); // セッション情報を取得して使用
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

    // 返信した投稿を取得
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
                icon: true, // アイコンも追加
              },
            },
          },
        },
        // 質問情報を追加
        Question: {
          take: 1,
          select: {
            id: true,
            question: true,
            answer: true,
            targetUserId: true,
            User_Question_targetUserIdToUser: {
              select: {
                username: true,
                icon: true,
              },
            },
          },
        },
        // いいね情報を取得
        favoritedBy: session?.user
          ? {
              where: {
                userId: session.user.id,
              },
              select: {
                userId: true,
              },
            }
          : undefined,
        // リポスト情報を取得
        repostedBy: session?.user
          ? {
              where: {
                userId: session.user.id,
              },
              select: {
                userId: true,
              },
            }
          : undefined,
        // カウント情報を取得
        _count: {
          select: {
            replies: true,
            favoritedBy: true,
            repostedBy: true,
          },
        },
      },
    });

    // 次ページの有無を確認
    const hasMore = replies.length > limit;
    const nextCursor = hasMore ? replies[limit - 1].id : undefined;
    const replyList = hasMore ? replies.slice(0, -1) : replies;

    // データを整形
    const formattedReplies = replyList.map((reply) => {
      // 質問情報を整形
      const question =
        reply.Question && reply.Question.length > 0
          ? {
              id: reply.Question[0].id,
              question: reply.Question[0].question,
              answer: reply.Question[0].answer,
              targetUserId: reply.Question[0].targetUserId,
              targetUser: {
                username:
                  reply.Question[0].User_Question_targetUserIdToUser.username,
                icon: reply.Question[0].User_Question_targetUserIdToUser.icon,
              },
            }
          : undefined;

      return {
        id: reply.id,
        content: reply.content,
        createdAt: reply.createdAt,
        user: reply.user,
        parent: reply.parent,
        favorites: reply._count.favoritedBy,
        reposts: reply._count.repostedBy,
        // 画像情報を追加
        images: reply.images,
        // いいね・リポスト状態を追加
        isFavorited: reply.favoritedBy?.length > 0 || false,
        isReposted: reply.repostedBy?.length > 0 || false,
        // 質問情報を追加
        question,
        // カウント情報を追加
        _count: {
          replies: reply._count.replies,
          favorites: reply._count.favoritedBy,
          reposts: reply._count.repostedBy,
        },
      };
    });

    const response: UserRepliesResponse = {
      replies: formattedReplies,
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    // 開発環境ではデバッグログを出力
    if (process.env.NODE_ENV === "development") {
      console.log(`[Debug] User/${params.id}/reply API:`, {
        repliesCount: formattedReplies.length,
        repliesWithQuestions: formattedReplies.filter((p) => p.question).length,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[User Replies Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
