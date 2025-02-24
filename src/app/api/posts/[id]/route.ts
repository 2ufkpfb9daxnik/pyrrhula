// posts/[id]              GET                 投稿詳細を見る
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

    // 投稿の詳細を取得
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
            user: {
              select: {
                id: true,
                username: true,
                icon: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
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
                },
              },
            }
          : {}),
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // レスポンスデータの整形
    const response: PostDetailResponse = {
      ...post,
      _count: {
        replies: post.replies?.length || 0, // 返信数をカウント
      },
      parent: post.parent
        ? {
            ...post.parent,
            createdAt: new Date(), // または適切な日付
            images: [], // または実際の画像配列
          }
        : null,
      replies: post.replies.map((reply) => ({
        ...reply,
        images: [], // または実際の画像配列
      })),
      ...(session?.user && {
        isFavorited: post.favoritedBy?.length > 0,
        isReposted: post.repostedBy?.length > 0,
      }),
    };
  } catch (error) {
    console.error("[Post Detail Error]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
