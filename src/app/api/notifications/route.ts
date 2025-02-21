// notifications/          GET                 通知を受け取る(supabase/next.js(vercel)/reactでリアルタイムに画面更新)
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NotificationsResponse } from "@/app/_types/notification";

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
