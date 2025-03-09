import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// 単一の通知を取得するGETリクエスト
export async function GET(
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

    // 通知を取得
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
        // 投稿関連の通知
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

    // 通知が存在しない場合
    if (!notification) {
      return NextResponse.json(
        { error: "通知が見つかりません" },
        { status: 404 }
      );
    }

    // 自分の通知のみ閲覧可能
    if (notification.receiverId !== session.user.id) {
      return NextResponse.json(
        { error: "この通知を閲覧する権限がありません" },
        { status: 403 }
      );
    }

    // レスポンス用のデータを整形
    const formattedNotification = {
      id: notification.id,
      type: notification.type,
      createdAt: notification.createdAt.toISOString(),
      isRead: notification.isRead,
      sender: notification.sender
        ? {
            id: notification.sender.id,
            username: notification.sender.username,
            icon: notification.sender.icon,
          }
        : null,
    };

    // 通知タイプに応じてデータを追加
    if (notification.type === "question" && notification.relatedPostId) {
      // 質問データを取得
      const question = await prisma.question.findUnique({
        where: { id: notification.relatedPostId },
        select: {
          id: true,
          question: true,
          answer: true,
          senderId: true,
          User_Question_senderIdToUser: {
            select: {
              username: true,
              icon: true,
            },
          },
        },
      });

      if (question) {
        Object.assign(formattedNotification, {
          question: {
            id: question.id,
            question: question.question,
            answer: question.answer,
            sender: {
              id: question.senderId,
              username: question.User_Question_senderIdToUser.username,
              icon: question.User_Question_senderIdToUser.icon,
            },
          },
        });
      }
    } else if (
      notification.type === "answer" &&
      Array.isArray(notification.post?.Question) &&
      notification.post.Question.length > 0
    ) {
      // 回答通知の場合、投稿から質問データを取得
      const questionData = notification.post.Question[0];
      Object.assign(formattedNotification, {
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
      });
    } else if (notification.relatedPostId && notification.post) {
      // 投稿関連の通知
      Object.assign(formattedNotification, {
        relatedPost: {
          id: notification.post.id,
          content: notification.post.content,
        },
      });
    } else if (notification.type === "msg" && notification.Chat) {
      // チャット通知
      Object.assign(formattedNotification, {
        chat: {
          id: notification.Chat.id,
          message: notification.Chat.message,
        },
      });
    }

    return NextResponse.json(formattedNotification);
  } catch (error) {
    console.error("[通知取得エラー]:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

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
      select: { receiverId: true, isRead: true },
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

    // 既に既読の場合は早期リターン（不要なDB更新を避ける）
    if (notification.isRead) {
      return NextResponse.json({
        success: true,
        notification: {
          id: notificationId,
          isRead: true,
          message: "既に既読になっています",
        },
      });
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

// 通知を削除するDELETEリクエスト
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

    return NextResponse.json({
      success: true,
      message: "通知を削除しました",
    });
  } catch (error) {
    console.error("[通知削除エラー]:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// 通知をトグル（既読/未読切替）するPATCHリクエスト
export async function PATCH(
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

    // 通知が存在し、現在の既読状態を取得
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { receiverId: true, isRead: true },
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

    // 既読状態を反転
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: !notification.isRead },
    });

    return NextResponse.json({
      success: true,
      notification: {
        id: updatedNotification.id,
        isRead: updatedNotification.isRead,
        message: updatedNotification.isRead
          ? "既読にしました"
          : "未読にしました",
      },
    });
  } catch (error) {
    console.error("[通知トグルエラー]:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
