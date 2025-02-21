import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcrypt";

export async function POST(request: Request) {
  console.log("APIリクエスト受信");

  try {
    const json = await request.json();
    console.log("リクエストボディ:", json);

    const { id, password } = json;

    if (!id || !password) {
      console.log("バリデーションエラー");
      return NextResponse.json(
        { error: "ユーザーIDとパスワードは必須です" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        password: true,
      },
    });

    console.log("ユーザー検索結果:", { found: !!user });

    if (!user || !await compare(password, user.password)) {
      return NextResponse.json(
        { error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
      }
    });

  } catch (error) {
    console.error("エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}