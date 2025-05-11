import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// リクエストボディのバリデーションスキーマ
const actionSchema = z.object({
  action: z.enum(["invite", "approve", "reject"]),
});

export async function POST(
  req: Request,
  { params }: { params: { listId: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { listId, userId } = params;
    const body = await req.json();
    const { action } = actionSchema.parse(body);

    // リストと管理者権限の確認
    const list = await prisma.lists.findUnique({
      where: { id: listId },
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

    // 現在のユーザーが管理者権限を持っているか確認
    if (list.creator_id !== session.user.id && !list.list_members.length) {
      return NextResponse.json(
        { error: "管理者権限がありません" },
        { status: 403 }
      );
    }

    // 対象メンバーの現在の状態を確認
    const member = await prisma.list_members.findUnique({
      where: {
        list_id_user_id: {
          list_id: listId,
          user_id: userId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "メンバーが見つかりません" },
        { status: 404 }
      );
    }

    let updatedMember;
    let notificationType = "";

    switch (action) {
      case "invite":
        // 管理者として招待
        updatedMember = await prisma.list_members.update({
          where: {
            list_id_user_id: {
              list_id: listId,
              user_id: userId,
            },
          },
          data: {
            is_admin: true,
            status: "pending",
          },
        });
        notificationType = "list_admin_invite";
        break;

      case "approve":
        // 管理者申請を承認
        updatedMember = await prisma.list_members.update({
          where: {
            list_id_user_id: {
              list_id: listId,
              user_id: userId,
            },
          },
          data: {
            is_admin: true,
            status: "approved",
          },
        });
        notificationType = "list_admin_request";
        break;

      case "reject":
        // 管理者申請を却下
        updatedMember = await prisma.list_members.update({
          where: {
            list_id_user_id: {
              list_id: listId,
              user_id: userId,
            },
          },
          data: {
            is_admin: false,
            status: "approved",
          },
        });
        notificationType = "list_admin_request";
        break;
    }

    // 通知を作成
    await prisma.notification.create({
      data: {
        receiverId: userId,
        senderId: session.user.id,
        type: notificationType,
        relatedPostId: null,
        isRead: false,
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("[リスト管理者操作エラー]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "無効な操作です" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "管理者操作の処理に失敗しました" },
      { status: 500 }
    );
  }
}
