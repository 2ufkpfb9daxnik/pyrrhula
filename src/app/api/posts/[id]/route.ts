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
        replies: post.replies?.length || 0,
      },
      parent: post.parent
        ? {
            ...post.parent,
            createdAt: post.parent.createdAt,
            images: post.parent.images || [],
          }
        : null,
      replies: post.replies.map((reply) => ({
        ...reply,
        images: reply.images || [],
      })),
      isFavorited: session?.user ? post.favoritedBy?.length > 0 : false,
      isReposted: session?.user ? post.repostedBy?.length > 0 : false,
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
