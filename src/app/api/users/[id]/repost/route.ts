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
    const session = await getServerSession(authOptions);
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
            // 返信数を取得
            _count: {
              select: {
                replies: true,
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
      reposts: repostList.map((repost) => {
        // 質問情報を整形
        const question =
          repost.post.Question && repost.post.Question.length > 0
            ? {
                id: repost.post.Question[0].id,
                question: repost.post.Question[0].question,
                answer: repost.post.Question[0].answer,
                targetUserId: repost.post.Question[0].targetUserId,
                targetUser: {
                  username:
                    repost.post.Question[0].User_Question_targetUserIdToUser
                      .username,
                  icon: repost.post.Question[0].User_Question_targetUserIdToUser
                    .icon,
                },
              }
            : undefined;

        return {
          id: repost.post.id,
          content: repost.post.content,
          createdAt: repost.post.createdAt,
          favorites: repost.post.favorites,
          reposts: repost.post.reposts,
          user: repost.post.user,
          repostedAt: repost.createdAt,
          // 画像情報を追加
          images: repost.post.images || [],
          // 質問情報を追加
          question: question,
          // いいね・リポスト状態を追加
          isFavorited: repost.post.favoritedBy?.length > 0 || false,
          isReposted: repost.post.repostedBy?.length > 0 || false,
          // 返信数情報を追加
          _count: {
            replies: repost.post._count?.replies || 0,
          },
          // 親投稿があれば追加（必要に応じて）
          parent: repost.post.parentId
            ? {
                id: repost.post.parentId,
                // 親投稿の情報は必要に応じて追加
              }
            : undefined,
        };
      }),
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    // 開発環境ではデバッグログを出力
    if (process.env.NODE_ENV === "development") {
      console.log(`[Debug] User/${params.id}/repost API:`, {
        repostsCount: response.reposts.length,
        repostsWithQuestions: response.reposts.filter((p) => p.question).length,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[User Reposts Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
