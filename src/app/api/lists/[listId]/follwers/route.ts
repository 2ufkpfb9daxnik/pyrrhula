//  api/lists/[listId]/follwers/route.ts
// GET リストのフォロワー一覧取得
// POST リストのフォロワー追加
// DELETE リストのフォロワー削除
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import type { ListFollowersResponse } from "@/app/_types/list";

// クエリパラメータのバリデーションスキーマ
const followersParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// GET: フォロワー一覧取得
export async function GET(
  req: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const validatedParams = followersParamsSchema.parse(
      Object.fromEntries(searchParams)
    );

    const followers = await prisma.list_followers.findMany({
      where: {
        list_id: params.listId,
      },
      take: validatedParams.limit + 1,
      ...(validatedParams.cursor && {
        cursor: { id: validatedParams.cursor },
        skip: 1,
      }),
      orderBy: { created_at: "desc" },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
      },
    });

    const hasMore = followers.length > validatedParams.limit;
    const data = hasMore ? followers.slice(0, -1) : followers;
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;

    const response: ListFollowersResponse = {
      followers: data.map((f) => ({
        id: f.id,
        listId: f.list_id,
        userId: f.user_id,
        createdAt: f.created_at?.toISOString() ?? new Date().toISOString(),
        user: f.User,
      })),
      hasMore,
      nextCursor,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[フォロワー一覧取得エラー]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "クエリパラメータが不正です", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "フォロワー一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: フォロワー追加
export async function POST(
  req: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // リストの存在確認
    const list = await prisma.lists.findUnique({
      where: { id: params.listId },
    });

    if (!list) {
      return NextResponse.json(
        { error: "リストが見つかりません" },
        { status: 404 }
      );
    }

    // フォロワーの追加
    const follower = await prisma.list_followers.create({
      data: {
        list_id: params.listId,
        user_id: session.user.id,
      },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
      },
    });

    return NextResponse.json(follower);
  } catch (error) {
    console.error("[フォロワー追加エラー]:", error);
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "すでにフォローしています" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "フォローに失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: フォロワー削除（フォロー解除）
export async function DELETE(
  req: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // フォロワーの削除
    await prisma.list_followers.delete({
      where: {
        list_id_user_id: {
          list_id: params.listId,
          user_id: session.user.id,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[フォロワー削除エラー]:", error);
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return NextResponse.json(
        { error: "フォローしていません" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "フォロー解除に失敗しました" },
      { status: 500 }
    );
  }
}
