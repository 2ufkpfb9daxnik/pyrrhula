// notifications/          GET                 通知を受け取る(supabase/next.js(vercel)/reactでリアルタイムに画面更新)
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NotificationsResponse } from "@/app/_types/notification";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ページネーションのパラメータ
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 20;

    // 通知を取得
    const notifications = await prisma.notification.findMany({
      where: {
        receiverId: session.user.id,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
        // 投稿関連の通知の場合、投稿情報も取得
        post: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });

    // 次ページの有無を確認
    const hasMore = notifications.length > limit;
    const nextCursor = hasMore ? notifications[limit - 1].id : undefined;
    const notificationList = hasMore
      ? notifications.slice(0, -1)
      : notifications;

    // レスポンスデータの整形
    const formattedNotifications = notificationList.map((notification) => ({
      id: notification.id,
      type: notification.type as "fol" | "fav" | "msg" | "rep",
      createdAt: notification.createdAt.toISOString(),
      isRead: notification.isRead ?? false,
      ...(notification.sender && {
        sender: {
          id: notification.sender.id,
          username: notification.sender.username,
          icon: notification.sender.icon,
        },
      }),
      ...(notification.relatedPostId &&
        notification.post && {
          relatedPost: {
            id: notification.post.id,
            content: notification.post.content,
          },
        }),
    }));

    const response: NotificationsResponse = {
      notifications: formattedNotifications,
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Notifications Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, postId, username } = await req.json();

    // メンション先のユーザーを検索
    const mentionedUser = await prisma.user.findUnique({
      where: { username },
    });

    if (!mentionedUser) {
      return NextResponse.json(
        { error: "Mentioned user not found" },
        { status: 404 }
      );
    }

    // 自分自身へのメンションは通知しない
    if (mentionedUser.id === session.user.id) {
      return NextResponse.json({ success: false });
    }

    // 通知を作成
    const notification = await prisma.notification.create({
      data: {
        type: "mention",
        senderId: session.user.id,
        receiverId: mentionedUser.id,
        relatedPostId: postId,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error("[Notification API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notificationId = params.id;

    // 通知が存在し、かつ現在のユーザーが受信者であることを確認
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { receiverId: true },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // 自分の通知のみを更新可能
    if (notification.receiverId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to update this notification" },
        { status: 403 }
      );
    }

    // 通知を既読に更新
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Mark Notification Read Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// すべての通知を一括で既読にするためのエンドポイント
export async function PATCH(req: Request) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 現在のユーザーの未読通知をすべて既読に更新
    const result = await prisma.notification.updateMany({
      where: {
        receiverId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("[Mark All Notifications Read Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
