import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const targetUserId = params.id;
    const questionId = params.questionId;

    // 質問を取得
    const question = await prisma.question.findUnique({
      where: {
        id: questionId,
      },
      include: {
        User_Question_targetUserIdToUser: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
        AnonymousQuestionToken: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "質問が見つかりません" },
        { status: 404 }
      );
    }

    // 分割代入を使用して新しいオブジェクトを作成
    const { User_Question_targetUserIdToUser, ...rest } = question;

    // 常に匿名化されたレスポンスを返す
    const responseData = {
      ...rest,
      sender: {
        id: "anonymous",
        username: "匿名質問者",
        icon: null,
      },
      targetUser: User_Question_targetUserIdToUser,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[質問詳細取得エラー]:", error);
    return NextResponse.json(
      { error: "質問の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const targetUserId = params.id;
    const questionId = params.questionId;

    // 管理者権限チェック
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (userId !== targetUserId && !currentUser?.isAdmin) {
      return NextResponse.json(
        { error: "この操作を実行する権限がありません" },
        { status: 403 }
      );
    }

    // リクエストボディを解析
    const { answer, createPost } = await req.json();

    // 質問が存在し、対象ユーザー宛てのものか確認
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        targetUserId: targetUserId,
      },
      include: {
        AnonymousQuestionToken: true, // 匿名トークン情報も取得
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "質問が見つからないか、回答する権限がありません" },
        { status: 404 }
      );
    }

    let relatedPostId = null;

    // 投稿作成処理
    if (createPost && answer && answer.trim() !== "") {
      const post = await prisma.post.create({
        data: {
          userId,
          content: answer.trim(),
          Question: {
            connect: {
              id: questionId,
            },
          },
        },
      });

      relatedPostId = post.id;
    }

    // 質問の回答を更新
    const updatedQuestion = await prisma.question.update({
      where: {
        id: questionId,
      },
      data: {
        answer: answer ? answer.trim() : null,
        answeredAt: answer ? new Date() : null,
        relatedPostId,
        status: answer ? "approved" : "pending",
      },
    });

    // 匿名質問への回答通知を作成
    if (answer && question.AnonymousQuestionToken.length > 0) {
      const anonymousToken = question.AnonymousQuestionToken[0];

      await prisma.notification.create({
        data: {
          receiverId: anonymousToken.userId, // トークンから質問者IDを取得
          senderId: targetUserId, // 回答者ID
          type: "answer", // 10文字以内
          createdAt: new Date(),
          isRead: false,
          relatedPostId,
          anonymousTokenId: anonymousToken.id,
        },
      });
    }

    // レスポンスでは質問者情報を匿名化
    return NextResponse.json({
      success: true,
      question: {
        ...updatedQuestion,
        sender: {
          id: "anonymous",
          username: "匿名質問者",
          icon: null,
        },
      },
    });
  } catch (error) {
    console.error("[質問回答エラー]:", error);
    return NextResponse.json(
      { error: "回答の保存中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
