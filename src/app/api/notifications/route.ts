import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type {
  NotificationsResponse,
  Notification,
} from "@/app/_types/notification";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 質問データの型定義
interface QuestionData {
  id: string;
  question: string;
  answer: string | null;
  targetUserId: string;
  User_Question_targetUserIdToUser: {
    username: string;
    icon: string | null;
  };
}

export async function GET(req: Request) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
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
        post: {
          select: {
            id: true,
            content: true,
            Question: {
              select: {
                id: true,
                question: true,
                answer: true,
                targetUserId: true,
                User_Question_targetUserIdToUser: {
                  select: {
                    username: true,
                    icon: true,
                  },
                },
              },
            },
          },
        },
        AnonymousQuestionToken: {
          select: {
            id: true,
            questionId: true,
          },
        },
        Chat: true,
      },
    });

    // ページネーション処理
    const hasMore = notifications.length > limit;
    const nextCursor = hasMore ? notifications[limit - 1].id : undefined;
    const notificationList = hasMore
      ? notifications.slice(0, -1)
      : notifications;

    // 質問通知の処理
    const questionNotifications = notificationList.filter(
      (n) => n.type === "anon_q" && n.relatedPostId
    );

    const questionIds = questionNotifications
      .map((n) => n.relatedPostId)
      .filter((id): id is string => id !== null);

    // 質問データの取得
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
          targetUserId: true,
          User_Question_targetUserIdToUser: {
            select: {
              username: true,
              icon: true,
            },
          },
        },
      });

      questions = questionData.reduce<Record<string, QuestionData>>(
        (acc, q) => {
          acc[q.id] = q;
          return acc;
        },
        {}
      );
    }

    // 通知データの整形
    const formattedNotifications: Notification[] = notificationList.map(
      (notification) => {
        const baseNotification = {
          id: notification.id,
          type: notification.type as Notification["type"],
          createdAt: notification.createdAt.toISOString(),
          isRead: notification.isRead ?? false,
          ...(notification.type !== "anon_q" &&
            notification.sender && {
              sender: {
                id: notification.sender.id,
                username: notification.sender.username,
                icon: notification.sender.icon,
              },
            }),
        };

        // 通知タイプに応じた処理
        if (notification.type === "anon_q" && notification.relatedPostId) {
          const questionData = questions[notification.relatedPostId];
          if (questionData) {
            return {
              ...baseNotification,
              question: {
                id: questionData.id,
                question: questionData.question,
                answer: questionData.answer,
                sender: {
                  id: "anonymous",
                  username: "匿名質問者",
                  icon: null,
                },
              },
            };
          }
        } else if (
          notification.type === "answer" &&
          notification.relatedPostId &&
          notification.post?.Question?.[0]
        ) {
          const questionData = notification.post.Question[0];
          return {
            ...baseNotification,
            question: {
              id: questionData.id,
              question: questionData.question,
              answer: questionData.answer,
              answerer: notification.sender
                ? {
                    id: notification.sender.id,
                    username: notification.sender.username,
                    icon: notification.sender.icon,
                  }
                : undefined,
            },
          };
        } else if (notification.relatedPostId && notification.post) {
          return {
            ...baseNotification,
            relatedPost: {
              id: notification.post.id,
              content: notification.post.content,
            },
          };
        } else if (notification.type === "msg" && notification.Chat) {
          return {
            ...baseNotification,
            chat: {
              id: notification.Chat.id,
              message: notification.Chat.message,
            },
          };
        }

        return baseNotification;
      }
    );

    const response: NotificationsResponse = {
      notifications: formattedNotifications,
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[通知取得エラー]:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const notificationId = params.id;

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

    if (notification.receiverId !== session.user.id) {
      return NextResponse.json(
        { error: "この通知を更新する権限がありません" },
        { status: 403 }
      );
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[通知既読更新エラー]:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

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
    console.error("[全通知既読更新エラー]:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
