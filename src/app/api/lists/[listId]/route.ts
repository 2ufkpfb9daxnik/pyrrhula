//  api/lists/[listId]/route.ts
// GET リスト詳細取得
// PUT リスト設定更新
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import type { ListResponse } from "@/app/_types/list";

const updateListSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional().nullable(),
  includeTimelinePosts: z.boolean().optional(),
});

// GET: リスト詳細取得
export async function GET(
  req: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const list = await prisma.lists.findUnique({
      where: { id: params.listId },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
        _count: {
          select: {
            list_members: {
              where: { status: "approved" },
            },
            list_followers: true,
            Post: true,
          },
        },
        list_members: userId
          ? {
              where: { user_id: userId },
              select: {
                is_admin: true,
                status: true,
              },
            }
          : false,
        list_followers: userId
          ? {
              where: { user_id: userId },
              select: { id: true },
            }
          : false,
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: "リストが見つかりません" },
        { status: 404 }
      );
    }

    // レスポンスの整形
    const response: ListResponse = {
      list: {
        id: list.id,
        name: list.name,
        description: list.description,
        creatorId: list.creator_id,
        isManaged: list.is_managed ?? false,
        includeTimelinePosts: list.include_timeline_posts ?? false,
        createdAt: list.created_at?.toISOString() ?? new Date().toISOString(),
        creator: list.User,
        _count: {
          members: list._count.list_members,
          followers: list._count.list_followers,
          posts: list._count.Post,
        },
      },
      isFollowing: list.list_followers?.length > 0,
      isMember: list.list_members?.length > 0,
      isAdmin: list.list_members?.[0]?.is_admin ?? false,
      memberStatus: list.list_members?.[0]?.status as
        | "approved"
        | "pending"
        | undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[リスト詳細取得エラー]:", error);
    return NextResponse.json(
      { error: "リスト情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: リスト設定更新
export async function PUT(
  req: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // リストと管理者権限の確認
    const list = await prisma.lists.findUnique({
      where: { id: params.listId },
      include: {
        list_members: {
          where: {
            user_id: session.user.id,
            is_admin: true,
            status: "approved",
          },
        },
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: "リストが見つかりません" },
        { status: 404 }
      );
    }

    if (list.creator_id !== session.user.id && !list.list_members.length) {
      return NextResponse.json(
        { error: "リストの更新権限がありません" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = updateListSchema.parse(body);

    // リストの更新
    const updatedList = await prisma.lists.update({
      where: { id: params.listId },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        include_timeline_posts: validatedData.includeTimelinePosts,
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

    return NextResponse.json(updatedList);
  } catch (error) {
    console.error("[リスト更新エラー]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "入力データが不正です", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "リストの更新に失敗しました" },
      { status: 500 }
    );
  }
}
