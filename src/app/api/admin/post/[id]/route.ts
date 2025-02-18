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

    // 投稿を取得（削除前に投稿者情報が必要）
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!post) {
      return new Response("Post not found", { status: 404 });
    }

    // トランザクションで関連データを一括削除
    await prisma.$transaction([
      // お気に入りを削除
      prisma.favorite.deleteMany({
        where: { postId: params.id },
      }),
      // リポストを削除
      prisma.repost.deleteMany({
        where: { postId: params.id },
      }),
      // 関連する通知を削除
      prisma.notification.deleteMany({
        where: { relatedPostId: params.id },
      }),
      // 投稿を削除
      prisma.post.delete({
        where: { id: params.id },
      }),
      // ユーザーの投稿数を更新
      prisma.user.update({
        where: { id: post.userId },
        data: { postCount: { decrement: 1 } },
      }),
      // 返信の投稿を処理
      prisma.post.updateMany({
        where: { parentId: params.id },
        data: { parentId: null },
      }),
    ]);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Admin Delete Post Error]:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
