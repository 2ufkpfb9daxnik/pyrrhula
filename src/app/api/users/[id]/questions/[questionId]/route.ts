import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string; questionId: string } }
) {
  // questionIdに修正
  try {
    const userId = params.id;
    const questionId = params.questionId; // questionsIdからquestionIdに修正

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

    const responseData = {
      ...rest,
      sender: {
        id: "anonymous",
        username: "名無し",
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

    console.log("デバッグ - セッションユーザー:", userId);
    console.log("デバッグ - ターゲットユーザー:", targetUserId);
    console.log("デバッグ - 質問ID:", questionId);

    // 質問対象のユーザーと現在のユーザーが一致するかのチェックを緩和
    // または認証ユーザーが管理者の場合も許可
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
      select: {
        id: true,
        question: true,
        answer: true,
        senderId: true,
      },
    });

    console.log("デバッグ - 見つかった質問:", question);

    if (!question) {
      return NextResponse.json(
        { error: "質問が見つからないか、回答する権限がありません" },
        { status: 404 }
      );
    }

    let relatedPostId = null;

    if (createPost && answer && answer.trim() !== "") {
      // 投稿内容は回答のみとする（質問はフロントエンドで別枠表示）
      const postContent = answer.trim();

      // 投稿を作成
      const post = await prisma.post.create({
        data: {
          userId,
          content: postContent,
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
      select: {
        id: true,
        question: true,
        answer: true,
        answeredAt: true,
        status: true,
        relatedPostId: true,
      },
    });

    // 回答通知を作成
    if (answer && question.senderId) {
      // 関連する投稿がある場合は投稿IDを、なければnullを設定
      await prisma.notification.create({
        data: {
          receiverId: question.senderId,
          senderId: userId,
          type: "answer",
          createdAt: new Date(),
          isRead: false,
          // 投稿に関連付けられている場合はそのIDを、なければnull
          relatedPostId: relatedPostId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error) {
    console.error("[質問回答エラー]:", error);
    return NextResponse.json(
      { error: "回答の保存中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
