// auth/signup             POST                アカウント作成
import prisma from "@/lib/prisma";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { SignupRequest } from "@/app/_types/next-auth";

/**
 * 4-16文字のランダムなユーザーIDを生成
 * 使用文字: a-z, A-Z, 0-9, _
 */
export function generateUserId(length: number = 8): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
  let result = "";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

export async function POST(req: Request) {
  try {
    const body: Omit<SignupRequest, "id"> = await req.json();

    // バリデーション
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: "全ての項目を入力してください" },
        { status: 400 }
      );
    }

    // ユーザー名の長さチェック
    if (body.username.length < 1 || body.username.length > 32) {
      return NextResponse.json(
        {
          error: "ユーザー名は1文字以上32文字以下にしてください",
        },
        { status: 400 }
      );
    }

    // ユーザー名に制御文字が含まれていないかチェック
    if (/[\u0000-\u001F\u007F-\u009F]/.test(body.username)) {
      return NextResponse.json(
        {
          error: "ユーザー名に制御文字を含めることはできません",
        },
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

    // 既存ユーザー名のチェック
    const existingUser = await prisma.user.findUnique({
      where: { username: body.username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "このユーザー名は既に使用されています" },
        { status: 409 }
      );
    }

    // ユニークなIDを生成（衝突時は再試行）
    let userId: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      userId = generateUserId(8); // 8文字のIDを生成
      const existingId = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingId) break;
      attempts++;

      if (attempts >= maxAttempts) {
        return NextResponse.json(
          { error: "Failed to generate unique user ID" },
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
      select: {
        id: true,
        username: true,
        icon: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("[Signup Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
