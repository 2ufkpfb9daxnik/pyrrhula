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
        User_Question_senderIdToUser: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
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
    const {
      User_Question_senderIdToUser,
      User_Question_targetUserIdToUser,
      ...rest
    } = question;

    const responseData = {
      ...rest,
      sender: User_Question_senderIdToUser,
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
