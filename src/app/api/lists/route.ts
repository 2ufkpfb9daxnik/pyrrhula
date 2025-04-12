//  api/lists/route.ts
// GET リスト一覧取得
// POST リスト作成

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

// リスト作成のバリデーションスキーマ
const createListSchema = z.object({
  name: z
    .string()
    .min(1, "名前を入力してください")
    .max(50, "50文字以内で入力してください"),
  description: z.string().max(500, "500文字以内で入力してください").optional(),
  isManaged: z.boolean(),
  includeTimelinePosts: z.boolean(),
  initialMembers: z.array(z.string()).default([]),
  initialAdmins: z.array(z.string()).default([]),
});

// GET: リスト一覧取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const lists = await prisma.lists.findMany({
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
              where: { status: "approved" }, // 承認済みメンバーのみカウント
            },
            list_followers: true,
          },
        },
        ...(userId && {
          list_members: {
            where: { user_id: userId },
            select: {
              is_admin: true,
              status: true,
            },
          },
          list_followers: {
            where: { user_id: userId },
            select: { id: true },
          },
        }),
      },
      orderBy: { created_at: "desc" },
    });

    const formattedLists = lists.map((list) => ({
      list: {
        id: list.id,
        name: list.name,
        description: list.description,
        creatorId: list.creator_id,
        isManaged: list.is_managed,
        includeTimelinePosts: list.include_timeline_posts,
        createdAt: list.created_at?.toISOString() ?? new Date().toISOString(),
        creator: list.User,
        _count: {
          members: list._count.list_members,
          followers: list._count.list_followers,
        },
      },
      isFollowing: list.list_followers?.length > 0,
      isMember: list.list_members?.length > 0,
      isAdmin: list.list_members?.[0]?.is_admin ?? false,
      memberStatus: list.list_members?.[0]?.status,
    }));

    return NextResponse.json(formattedLists);
  } catch (error) {
    console.error("[リスト一覧取得エラー]:", error);
    return NextResponse.json(
      { error: "リスト一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

type CreateListInput = z.infer<typeof createListSchema>;

export async function POST(req: Request) {
  try {
    // セッションチェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // リクエストボディの検証
    const body = await req.json();
    const validatedData = createListSchema.parse(body);

    // トランザクションで一連の処理を実行
    const list = await prisma.$transaction(async (tx) => {
      // 1. リストの作成
      const list = await tx.lists.create({
        data: {
          name: validatedData.name,
          description: validatedData.description ?? "",
          creator_id: session.user.id,
          is_managed: validatedData.isManaged,
          include_timeline_posts: validatedData.includeTimelinePosts,
        },
      });

      // 2. 作成者を管理者としてメンバーに追加
      await tx.list_members.create({
        data: {
          list_id: list.id,
          user_id: session.user.id,
          is_admin: true,
          status: "approved",
        },
      });

      // 3. 初期メンバーの追加（重複を除外）
      if (validatedData.initialMembers.length > 0) {
        const uniqueMembers = Array.from(new Set(validatedData.initialMembers));

        // 作成者は既に追加済みなので除外
        const membersToAdd = uniqueMembers.filter(
          (id) => id !== session.user.id
        );

        if (membersToAdd.length > 0) {
          await tx.list_members.createMany({
            data: membersToAdd.map((userId) => ({
              list_id: list.id,
              user_id: userId,
              is_admin: validatedData.initialAdmins.includes(userId),
              status: validatedData.isManaged ? "pending" : "approved",
            })),
            skipDuplicates: true,
          });
        }
      }

      // 作成したリストを返却
      return list;
    });

    return NextResponse.json(list);
  } catch (error) {
    console.error("[リスト作成エラー]:", error);

    // バリデーションエラー
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "入力データが不正です",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Prismaのユニーク制約違反
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "メンバーの追加に失敗しました（重複）" },
          { status: 400 }
        );
      }
    }

    // その他のエラー
    return NextResponse.json(
      { error: "リストの作成に失敗しました" },
      { status: 500 }
    );
  }
}
