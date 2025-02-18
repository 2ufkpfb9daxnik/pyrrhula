// api/posts/route.ts
// 投稿一覧を取得するAPIのルーティングを定義

import prisma from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

// [GET] /api/posts 投稿一覧の取得
export const GET = async (req: NextRequest) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: "desc", // 降順 (新しい順)
      },
    });
    return NextResponse.json(posts);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "投稿の取得に失敗しました" },
      { status: 500 } // 500: Internal Server Error
    );
  }
};
