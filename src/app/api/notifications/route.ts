// notifications/          GET                 通知を受け取る(supabase/next.js(vercel)/reactでリアルタイムに画面更新)
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NotificationsResponse } from "@/app/_types/notification";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 質問データの型定義を追加
interface QuestionData {
  id: string;
  question: string;
  answer: string | null;
  senderId: string;
  targetUserId: string;
  User_Question_senderIdToUser: {
    username: string;
    icon: string | null;
  };
}

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
            Question: {
              // 投稿に関連する質問も取得（回答通知用）
              select: {
                id: true,
                question: true,
                answer: true,
                senderId: true,
                targetUserId: true,
                User_Question_senderIdToUser: {
                  select: {
                    username: true,
                    icon: true,
                  },
                },
              },
            },
          },
        },
        // チャット通知用
        Chat: true,
      },
    });

    // 次ページの有無を確認
    const hasMore = notifications.length > limit;
    const nextCursor = hasMore ? notifications[limit - 1].id : undefined;
    const notificationList = hasMore
      ? notifications.slice(0, -1)
      : notifications;

    // 質問通知からの質問IDを抽出（質問通知の場合はrelatedPostIdが質問ID）
    const questionNotifications = notificationList.filter(
      (n) => n.type === "question" && n.relatedPostId
    );

    const questionIds = questionNotifications
      .map((n) => n.relatedPostId)
      .filter((id): id is string => id !== null);

    // 質問データを取得
    let questions: Record<string, QuestionData> = {};
    if (questionIds.length > 0) {
      const questionData = await prisma.question.findMany({
        where: {
          id: {
            in: questionIds,
          },
        },
        select: {
          id: true,
          question: true,
          answer: true,
          senderId: true,
          targetUserId: true,
          User_Question_senderIdToUser: {
            select: {
              username: true,
              icon: true,
            },
          },
        },
      });

      // reduce関数に型を明示的に指定
      questions = questionData.reduce<Record<string, QuestionData>>(
        (acc, q) => {
          acc[q.id] = q;
          return acc;
        },
        {}
      );
    }

    // レスポンスデータの整形
    const formattedNotifications = notificationList.map((notification) => {
      const baseNotification = {
        id: notification.id,
        type: notification.type as
          | "fol"
          | "fav"
          | "msg"
          | "rep"
          | "question"
          | "answer"
          | "mention",
        createdAt: notification.createdAt.toISOString(),
        isRead: notification.isRead ?? false,
        ...(notification.sender && {
          sender: {
            id: notification.sender.id,
            username: notification.sender.username,
            icon: notification.sender.icon,
          },
        }),
      };

      // 通知タイプに応じて返すデータを変える
      if (notification.type === "question" && notification.relatedPostId) {
        // 質問通知の場合、relatedPostIdは質問ID
        const questionData = questions[notification.relatedPostId];
        if (questionData) {
          return {
            ...baseNotification,
            question: {
              id: questionData.id,
              question: questionData.question,
              answer: questionData.answer,
              sender: {
                id: questionData.senderId,
                username: questionData.User_Question_senderIdToUser.username,
                icon: questionData.User_Question_senderIdToUser.icon,
              },
            },
          };
        }
      } else if (
        notification.type === "answer" &&
        notification.relatedPostId &&
        notification.post
      ) {
        // 回答通知の場合、relatedPostIdは投稿IDなので、投稿から質問を取得
        if (
          notification.post.Question &&
          notification.post.Question.length > 0
        ) {
          const questionData = notification.post.Question[0];
          return {
            ...baseNotification,
            question: {
              id: questionData.id,
              question: questionData.question,
              answer: questionData.answer,
              sender: {
                id: questionData.senderId,
                username: questionData.User_Question_senderIdToUser.username,
                icon: questionData.User_Question_senderIdToUser.icon,
              },
            },
          };
        }
      } else if (notification.relatedPostId && notification.post) {
        // 通常の投稿関連通知
        return {
          ...baseNotification,
          relatedPost: {
            id: notification.post.id,
            content: notification.post.content,
          },
        };
      }

      // チャット関連通知
      if (notification.type === "msg" && notification.Chat) {
        return {
          ...baseNotification,
          chat: {
            id: notification.Chat.id,
            message: notification.Chat.message,
          },
        };
      }

      return baseNotification;
    });

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
