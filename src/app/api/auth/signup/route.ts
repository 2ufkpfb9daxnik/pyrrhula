// auth/signup             POST                アカウント作成
import prisma from "@/lib/prisma";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { SignupRequest } from "@/app/_types/next-auth";

export async function POST(req: Request) {
  /**
   * 4-16文字のランダムなユーザーIDを生成
   * 使用文字: a-z, A-Z, 0-9, _
   */
  function generateUserId(): string {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
    // 4から16の間でランダムな長さを生成
    const length = Math.floor(Math.random() * (16 - 4 + 1)) + 4;
    let result = "";
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }

    return result;
  }

  try {
    const body: Omit<SignupRequest, "id"> = await req.json();

    // バリデーション
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: "全ての項目を入力してください" },
        { status: 400 }
      );
    }

    // パスワードの長さチェック
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上にしてください" },
        { status: 400 }
      );
    }

    // ユニークなIDを生成（衝突時は再試行）
    let userId: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      userId = generateUserId(); // 4-16文字のIDを生成
      const existingId = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingId) break;
      attempts++;

      if (attempts >= maxAttempts) {
        return NextResponse.json(
          { error: "ユーザーIDの生成に失敗しました" },
          { status: 500 }
        );
      }
    } while (true);

    // パスワードのハッシュ化
    const hashedPassword = await hash(body.password, 10);

    // アイコンの生成（DiceBear Bottts）
    const icon = `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;

    // ユーザーの作成
    const user = await prisma.user.create({
      data: {
        id: userId,
        username: body.username,
        password: hashedPassword,
        icon,
        isAdmin: false,
        rate: 0,
        postCount: 0,
      },
    });

    // IDのみを返す
    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    console.error("[Signup Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
