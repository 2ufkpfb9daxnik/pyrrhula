// auth/signup             POST                アカウント作成
import prisma from "@/lib/prisma";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { SignupRequest } from "@/app/_types/next-auth";
import { Prisma } from "@prisma/client";

const USERNAME_MAX = 32;
const PASSWORD_MIN = 8;

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
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "全ての項目を入力してください" },
        { status: 400 },
      );
    }

    if (username.length > USERNAME_MAX) {
      return NextResponse.json(
        { error: `ユーザー名は${USERNAME_MAX}文字以内にしてください` },
        { status: 400 },
      );
    }

    if (password.length < PASSWORD_MIN) {
      return NextResponse.json(
        { error: `パスワードは${PASSWORD_MIN}文字以上にしてください` },
        { status: 400 },
      );
    }

    // ユニークなIDを生成（衝突時は再試行）
    let userId = "";
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      userId = generateUserId();
      const existingId = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingId) break;
      attempts++;
    }

    if (attempts >= maxAttempts || !userId) {
      return NextResponse.json(
        { error: "ユーザーIDの生成に失敗しました" },
        { status: 500 },
      );
    }

    const hashedPassword = await hash(password, 10);
    const icon = `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;

    const user = await prisma.user.create({
      data: {
        id: userId,
        username,
        password: hashedPassword,
        icon,
        isAdmin: false,
        rate: 0,
        postCount: 0,
      },
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    console.error("[Signup Error]:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "そのユーザー名は既に使われています" },
        { status: 409 },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2000"
    ) {
      return NextResponse.json(
        {
          error: `入力が長すぎます。ユーザー名は${USERNAME_MAX}文字以内にしてください`,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
