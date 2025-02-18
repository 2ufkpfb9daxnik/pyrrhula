// admin/user/[id]         DELETE              ユーザー削除(admin限定)
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 管理者権限チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return new Response("Forbidden", { status: 403 });
    }

    // 削除対象ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // 管理者は削除できない
    if (user.isAdmin) {
      return new Response("Cannot delete admin user", { status: 403 });
    }

    // トランザクションで関連データを一括削除
    await prisma.$transaction([
      // ユーザーのお気に入りを削除
      prisma.favorite.deleteMany({
        where: { userId: params.id },
      }),

      // ユーザーのリポストを削除
      prisma.repost.deleteMany({
        where: { userId: params.id },
      }),

      // フォロー関係を削除
      prisma.follow.deleteMany({
        where: {
          OR: [{ followerId: params.id }, { followedId: params.id }],
        },
      }),

      // チャットメッセージを削除
      prisma.chat.deleteMany({
        where: {
          OR: [{ senderId: params.id }, { receiverId: params.id }],
        },
      }),

      // 通知を削除
      prisma.notification.deleteMany({
        where: {
          OR: [{ receiverId: params.id }, { senderId: params.id }],
        },
      }),

      // ユーザーの投稿を削除（返信の処理含む）
      prisma.post.deleteMany({
        where: { userId: params.id },
      }),

      // 最後にユーザーを削除
      prisma.user.delete({
        where: { id: params.id },
      }),
    ]);

    return new Response("User deleted successfully", { status: 200 });
  } catch (error) {
    console.error("[Admin Delete User Error]:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
