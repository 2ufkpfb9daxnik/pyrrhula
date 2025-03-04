import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { updateUserStats } from "@/lib/user-stats";
import prisma from "@/lib/prisma";

// バッチサイズの定義 - 一度に処理するユーザー数
const BATCH_SIZE = 5;

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

    console.log(`合計 ${users.length} 人のユーザーを処理します`);

    // バッチ処理の実装
    const results = [];
    const errors = [];

    // ユーザーを小さなバッチに分割
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(
        `バッチ処理: ${i + 1}～${Math.min(i + BATCH_SIZE, users.length)}/${users.length}`
      );

      try {
        // 各バッチを順次処理（並列ではなく）
        for (const user of batch) {
          try {
            const result = await updateUserStats(user.id);
            results.push({ userId: user.id, success: true, result });
            console.log(`ユーザー ${user.id} の統計を更新しました`);
          } catch (userError) {
            console.error(
              `Error updating stats for user ${user.id}:`,
              userError
            );
            errors.push({
              userId: user.id,
              error: (userError as Error).message,
            });
          }

          // 接続プールの回復のために少し待機
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (batchError) {
        console.error(`バッチ処理中にエラーが発生しました:`, batchError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} 人のユーザー統計を更新しました。${errors.length} 件のエラーが発生しました。`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error updating all user stats:", error);
    return NextResponse.json(
      { error: "統計の更新に失敗しました" },
      { status: 500 }
    );
  }
}
