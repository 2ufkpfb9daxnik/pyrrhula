// auth/login              POST/DELETE         ログイン/ログアウト
import prisma from "@/lib/prisma";
import { compare } from "bcrypt";
import { NextResponse } from "next/server";

interface LoginRequestBody {
  id: string; // usernameからidに変更
  password: string;
}

export async function POST(req: Request) {
  try {
    const body: LoginRequestBody = await req.json();

    // バリデーション
    if (!body.id || !body.password) {
      return NextResponse.json(
        { error: "ユーザーIDとパスワードを入力してください" },
        { status: 400 }
      );
    }

    // ユーザーの検索
    const user = await prisma.user.findUnique({
      where: { id: body.id }, // usernameからidに変更
      select: {
        id: true,
        username: true,
        password: true,
        isAdmin: true,
        icon: true,
        rate: true,
        postCount: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // パスワードの検証
    const isValidPassword = await compare(body.password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // パスワードを除外してユーザー情報を返す
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("[Login Error]:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json({ message: "ログアウトしました" });
}
