import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 現在の投稿を取得
    const currentPost = await prisma.post.findUnique({
      where: { id: params.id },
      select: {
        userId: true,
        createdAt: true,
      },
    });

    if (!currentPost) {
      return NextResponse.json(
        { error: "投稿が見つかりません" },
        { status: 404 }
      );
    }

    // 前後の投稿を取得
    const [previousPost, nextPost] = await Promise.all([
      // 時系列で前の投稿
      prisma.post.findFirst({
        where: {
          userId: currentPost.userId,
          createdAt: {
            lt: currentPost.createdAt,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
        },
      }),
      // 時系列で次の投稿
      prisma.post.findFirst({
        where: {
          userId: currentPost.userId,
          createdAt: {
            gt: currentPost.createdAt,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      previousPost,
      nextPost,
    });
  } catch (error) {
    console.error("Error fetching sibling posts:", error);
    return NextResponse.json(
      { error: "投稿の取得に失敗しました" },
      { status: 500 }
    );
  }
}
