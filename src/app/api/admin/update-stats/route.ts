import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { updateUserStats } from "@/lib/user-stats";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: { id: true },
    });

    const results = await Promise.all(
      users.map((user) => updateUserStats(user.id))
    );

    return NextResponse.json({
      success: true,
      message: `${users.length}人のユーザー統計を更新しました`,
      results,
    });
  } catch (error) {
    console.error("Error updating all user stats:", error);
    return NextResponse.json(
      { error: "統計の更新に失敗しました" },
      { status: 500 }
    );
  }
}
