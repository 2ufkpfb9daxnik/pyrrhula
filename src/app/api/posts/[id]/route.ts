import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { PostDetailResponse } from "@/app/_types/post";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    const post = await prisma.post.findUnique({
      where: {
        id: params.id,
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
            createdAt: true,
            images: true,
            user: {
              select: {
                id: true,
                username: true,
                icon: true,
              },
            },
          },
        },
        replies: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            favorites: true,
            reposts: true,
            images: true,
            user: {
              select: {
                id: true,
                username: true,
                icon: true,
              },
            },
            // 返信の質問情報も取得
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
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        // 投稿本体の質問情報を取得
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
        ...(session?.user
          ? {
              favoritedBy: {
                where: {
                  userId: session.user.id,
                },
                select: {
                  userId: true,
                },
              },
              repostedBy: {
                where: {
                  userId: session.user.id,
                },
                select: {
                  userId: true,
                  createdAt: true,
                },
              },
            }
          : {}),
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // 拡散情報を取得（最新の拡散ユーザーを取得）
    const repostInfo = session?.user
      ? await prisma.repost.findFirst({
          where: {
            postId: params.id,
          },
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
          take: 1,
        })
      : null;

    // 投稿の質問情報を整形
    const question =
      post.Question && post.Question.length > 0
        ? {
            id: post.Question[0].id,
            question: post.Question[0].question,
            answer: post.Question[0].answer,
            targetUserId: post.Question[0].targetUserId,
            targetUser: {
              username:
                post.Question[0].User_Question_targetUserIdToUser.username,
              icon: post.Question[0].User_Question_targetUserIdToUser.icon,
            },
          }
        : undefined;

    // 返信の質問情報を整形
    const formattedReplies = post.replies.map((reply) => {
      const replyQuestion =
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
        ...reply,
        images: reply.images || [],
        question: replyQuestion,
      };
    });

    // レスポンスデータの整形
    const response: PostDetailResponse = {
      ...post,
      _count: {
        replies: post.replies?.length || 0,
      },
      parent: post.parent
        ? {
            ...post.parent,
            createdAt: post.parent.createdAt,
            images: post.parent.images || [],
          }
        : null,
      replies: formattedReplies,
      isFavorited: session?.user ? post.favoritedBy?.length > 0 : false,
      isReposted: session?.user ? post.repostedBy?.length > 0 : false,
      // 拡散情報を追加
      repostedAt:
        post.repostedBy && post.repostedBy.length > 0
          ? post.repostedBy[0].createdAt
          : undefined,
      // 拡散者の情報を追加
      repostedBy: repostInfo
        ? {
            id: repostInfo.user.id,
            username: repostInfo.user.username,
            icon: repostInfo.user.icon,
          }
        : undefined,
      // 質問情報を追加
      question: question,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Post Detail Error]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
