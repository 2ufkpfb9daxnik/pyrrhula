import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto"; // Node.js組み込みのUUID生成
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const targetUserId = params.id;

    // クエリパラメータの取得
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 10; // 1回のリクエストで取得する質問の数
    const isAnsweredOnly = searchParams.get("answered") === "true";
    const isUnansweredOnly = searchParams.get("unanswered") === "true";

    // ターゲットユーザーが存在するか確認
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // フィルタリング条件を構築
    const whereCondition: any = {
      targetUserId,
      isPublished: true, // 公開されている質問のみ
    };

    // 回答済み/未回答のフィルタリング
    if (isAnsweredOnly) {
      whereCondition.answer = { not: null };
    } else if (isUnansweredOnly) {
      whereCondition.answer = null;
    }

    // 質問を取得
    const questions = await prisma.question.findMany({
      where: whereCondition,
      take: limit + 1, // 次ページがあるか確認するため1つ余分に取得
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        question: true,
        answer: true,
        createdAt: true,
        answeredAt: true,
        status: true,
        senderId: true,
        // 送信者の情報を含める
        User_Question_senderIdToUser: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
      },
    });

    // 次ページの有無を確認
    const hasMore = questions.length > limit;
    const nextCursor = hasMore ? questions[limit - 1].id : undefined;
    const questionsList = hasMore ? questions.slice(0, -1) : questions;

    // クライアント向けに整形したデータを返す
    const formattedQuestions = questionsList.map((question) => ({
      id: question.id,
      question: question.question,
      answer: question.answer,
      createdAt: question.createdAt,
      answeredAt: question.answeredAt,
      status: question.status,
      sender: {
        id: question.User_Question_senderIdToUser.id,
        username: question.User_Question_senderIdToUser.username,
        icon: question.User_Question_senderIdToUser.icon,
      },
    }));

    return NextResponse.json({
      questions: formattedQuestions,
      hasMore,
      ...(nextCursor && { nextCursor }),
    });
  } catch (error) {
    console.error("[質問一覧取得エラー]:", error);
    return NextResponse.json(
      { error: "質問一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const targetUserId = params.id;
    const senderId = session.user.id;

    // 自分自身への質問は禁止
    if (senderId === targetUserId) {
      return NextResponse.json(
        { error: "自分自身に質問することはできません" },
        { status: 400 }
      );
    }

    // 質問対象のユーザーが存在するか確認
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // リクエストボディから質問内容を取得
    const { question } = await req.json();

    if (!question || typeof question !== "string" || question.trim() === "") {
      return NextResponse.json(
        { error: "質問内容を入力してください" },
        { status: 400 }
      );
    }

    // 質問が長すぎないかチェック
    if (question.length > 500) {
      return NextResponse.json(
        { error: "質問は500文字以内で入力してください" },
        { status: 400 }
      );
    }

    try {
      // IDフィールドを完全に省略して質問を作成
      // @db.Uuidに対応するため、明示的に指定しない
      const createdQuestion = await prisma.question.create({
        data: {
          senderId,
          targetUserId,
          question: question.trim(),
          status: "pending",
          isPublished: true,
        },
        select: {
          id: true,
          question: true,
          createdAt: true,
          status: true,
        },
      });

      console.log("作成された質問:", createdQuestion);

      return NextResponse.json(
        {
          success: true,
          question: createdQuestion,
        },
        { status: 201 }
      );
    } catch (prismaError) {
      console.error("Prisma作成エラー:", prismaError);

      // フォールバック: データベース側のエラーが明確になるようにする
      return NextResponse.json(
        {
          error: "質問の保存中にデータベースエラーが発生しました",
          details: (prismaError as Error).message || "unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[質問送信エラー]:", error);
    return NextResponse.json(
      { error: "質問の送信中にエラーが発生しました" },
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
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const targetUserId = params.id;

    console.log("デバッグ - セッションユーザー:", userId);
    console.log("デバッグ - ターゲットユーザー:", targetUserId);

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
    const { questionId, answer, createPost } = await req.json();
    console.log("デバッグ - リクエストボディ:", {
      questionId,
      answer: answer?.substring(0, 20),
      createPost,
    });

    if (!questionId) {
      return NextResponse.json({ error: "質問IDが必要です" }, { status: 400 });
    }

    // 質問が存在し、対象ユーザー宛てのものか確認
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        targetUserId: targetUserId, // 明示的にtargetUserIdを使用
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

    // 投稿も作成する場合
    if (createPost && answer && answer.trim() !== "") {
      // 投稿内容を作成
      const postContent = `Q: ${question.question}\n\nA: ${answer}`;

      // 投稿を作成
      const post = await prisma.post.create({
        data: {
          userId,
          content: postContent,
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
      await prisma.notification.create({
        data: {
          receiverId: question.senderId,
          senderId: userId,
          type: "answer",
          createdAt: new Date(),
          isRead: false,
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
