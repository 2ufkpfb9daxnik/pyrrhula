import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// 個別の通知を既読にするPUTリクエスト
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const notificationId = params.id;

    // 通知が存在し、かつ現在のユーザーが受信者であることを確認
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { receiverId: true },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "通知が見つかりません" },
        { status: 404 }
      );
    }

    // 自分の通知のみを更新可能
    if (notification.receiverId !== session.user.id) {
      return NextResponse.json(
        { error: "この通知を更新する権限がありません" },
        { status: 403 }
      );
    }

    // 通知を既読に更新
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      notification: {
        id: updatedNotification.id,
        isRead: updatedNotification.isRead,
      },
    });
  } catch (error) {
    console.error("[通知既読化エラー]:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// 通知を削除するDELETEリクエスト（必要に応じて）
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const notificationId = params.id;

    // 通知が存在し、かつ現在のユーザーが受信者であることを確認
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { receiverId: true },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "通知が見つかりません" },
        { status: 404 }
      );
    }

    // 自分の通知のみを削除可能
    if (notification.receiverId !== session.user.id) {
      return NextResponse.json(
        { error: "この通知を削除する権限がありません" },
        { status: 403 }
      );
    }

    // 通知を削除
    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[通知削除エラー]:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
