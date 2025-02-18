// users/                  GET                 ユーザー一覧取得
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { UserListResponse } from "@/app/_types/users";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Number(searchParams.get("limit")) || 20;
    const sortBy = searchParams.get("sort") || "rate"; // "rate" or "createdAt"
    const order = searchParams.get("order") || "desc"; // "asc" or "desc"

    // 並び替え条件を設定
    const orderBy = {
      [sortBy === "rate" ? "rate" : "createdAt"]: order as "asc" | "desc",
    };

    // ユーザー一覧を取得
    const users = await prisma.user.findMany({
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy,
      select: {
        id: true,
        username: true,
        icon: true,
        rate: true,
        postCount: true,
        createdAt: true,
      },
    });

    // 次ページの有無を確認
    const hasMore = users.length > limit;
    const nextCursor = hasMore ? users[limit - 1].id : undefined;
    const userList = hasMore ? users.slice(0, -1) : users;

    const response: UserListResponse = {
      users: userList,
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[User List Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
