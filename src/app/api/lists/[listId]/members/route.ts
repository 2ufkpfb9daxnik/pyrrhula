//  api/lists/[listId]/members/route.ts
// GET リストのメンバー一覧取得
// POST リストのメンバー追加
// DELETE リストのメンバー削除
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import type { ListMembersResponse } from "@/app/_types/list";

// クエリパラメータのバリデーションスキーマ
const membersParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["pending", "approved"]).optional(),
});

// メンバー追加のバリデーションスキーマ
const addMemberSchema = z.object({
  userId: z.string().min(1),
  isAdmin: z.boolean().optional(),
});

// GET: メンバー一覧取得
export async function GET(
  req: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const validatedParams = membersParamsSchema.parse(
      Object.fromEntries(searchParams)
    );

    const members = await prisma.list_members.findMany({
      where: {
        list_id: params.listId,
        ...(validatedParams.status && { status: validatedParams.status }),
      },
      take: validatedParams.limit + 1,
      ...(validatedParams.cursor && {
        cursor: { id: validatedParams.cursor },
        skip: 1,
      }),
      orderBy: [{ is_admin: "desc" }, { joined_at: "desc" }],
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

    const hasMore = members.length > validatedParams.limit;
    const data = hasMore ? members.slice(0, -1) : members;
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;

    const response: ListMembersResponse = {
      members: data.map((m) => ({
        id: m.id,
        listId: m.list_id,
        userId: m.user_id,
        isAdmin: m.is_admin ?? false,
        status: m.status as "pending" | "approved",
        joinedAt: m.joined_at?.toISOString() ?? new Date().toISOString(),
        user: m.User,
      })),
      hasMore,
      nextCursor,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[メンバー一覧取得エラー]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "クエリパラメータが不正です", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "メンバー一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: メンバー追加
export async function POST(
  req: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = addMemberSchema.parse(body);

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
        { error: "メンバーを追加する権限がありません" },
        { status: 403 }
      );
    }

    // メンバーの追加
    const member = await prisma.list_members.create({
      data: {
        list_id: params.listId,
        user_id: validatedData.userId,
        is_admin: validatedData.isAdmin ?? false,
        status: list.is_managed ? "pending" : "approved",
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

    return NextResponse.json(member);
  } catch (error) {
    console.error("[メンバー追加エラー]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "入力データが不正です", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "すでにメンバーとして追加されています" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "メンバーの追加に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: メンバー削除
export async function DELETE(
  req: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "ユーザーIDが指定されていません" },
        { status: 400 }
      );
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

    // 権限チェック
    const canRemoveMember =
      list.creator_id === session.user.id || // 作成者
      list.list_members.length > 0 || // 管理者
      userId === session.user.id; // 自分自身

    if (!canRemoveMember) {
      return NextResponse.json(
        { error: "メンバーを削除する権限がありません" },
        { status: 403 }
      );
    }

    // メンバーの削除
    await prisma.list_members.delete({
      where: {
        list_id_user_id: {
          list_id: params.listId,
          user_id: userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[メンバー削除エラー]:", error);
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return NextResponse.json(
        { error: "指定されたメンバーが見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "メンバーの削除に失敗しました" },
      { status: 500 }
    );
  }
}
