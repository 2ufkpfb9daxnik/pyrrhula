import prisma from "@/lib/prisma";
import { compare } from "bcrypt";
import { NextResponse } from "next/server";

interface LoginRequestBody {
  id: string;
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
      where: { id: body.id },
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

    // パスワードの比較
    const isValid = await compare(body.password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // 認証成功
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        icon: user.icon,
        rate: user.rate,
        postCount: user.postCount,
      },
    });
  } catch (error) {
    console.error("[Login Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json({ message: "ログアウトしました" });
}
