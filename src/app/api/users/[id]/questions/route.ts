import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
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
        // 常に質問者情報を匿名化するため、senderId不要
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
      // 常に匿名で表示
      sender: {
        id: "anonymous",
        username: "匿名質問者",
        icon: null,
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
      // 質問を作成（常に匿名）
      const createdQuestion = await prisma.question.create({
        data: {
          senderId,
          targetUserId,
          question: question.trim(),
          status: "pending",
          isPublished: true,
          isAnonymous: true, // すべての質問を匿名化
        },
        select: {
          id: true,
          question: true,
          createdAt: true,
          status: true,
        },
      });

      // 匿名トークンを作成（回答通知を送るため）
      await prisma.anonymousQuestionToken.create({
        data: {
          questionId: createdQuestion.id,
          userId: senderId,
        },
      });

      // 質問通知を作成（10文字以内の型名を使用）
      await prisma.notification.create({
        data: {
          receiverId: targetUserId,
          senderId: null, // 匿名質問の場合は送信者IDを設定しない
          type: "anon_q", // 10文字以内に短縮
          createdAt: new Date(),
          isRead: false,
          relatedPostId: createdQuestion.id,
        },
      });

      return NextResponse.json(
        {
          success: true,
          question: {
            ...createdQuestion,
            // 匿名質問であることを示す
            sender: {
              id: "anonymous",
              username: "匿名質問者",
              icon: null,
            },
          },
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
