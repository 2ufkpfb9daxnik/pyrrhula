import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRatingHistory, RATING_REASONS } from "@/lib/rating";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// 認証をチェックする関数
function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  // Bearer tokenを取得
  const [bearer, token] = authHeader.split(" ");
  if (bearer !== "Bearer" || !token) return false;

  // 環境変数と比較
  return token === process.env.CRON_SECRET;
}

export async function POST(req: Request) {
  try {
    // 認証チェック
    if (!isAuthorized(req)) {
      console.error("Unauthorized cron job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // すべてのユーザーを取得
    const users = await prisma.user.findMany({
      select: {
        id: true,
        createdAt: true,
        rate: true,
      },
    });

    // 各ユーザーのアカウント年齢に基づいてレートを更新
    const updates = await Promise.all(
      users.map(async (user) => {
        const accountAgeDays = Math.floor(
          (Date.now() - new Date(user.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        // アカウント年齢ボーナスを計算
        const ageBonus = Math.floor(Math.log(accountAgeDays + 1) * 5);
        const newRate = user.rate + ageBonus;

        if (ageBonus > 0) {
          // レート履歴を記録
          await createRatingHistory(
            user.id,
            ageBonus,
            newRate,
            RATING_REASONS.ACCOUNT_AGE
          );

          // ユーザーのレートを更新
          await prisma.user.update({
            where: { id: user.id },
            data: { rate: newRate },
          });

          return {
            userId: user.id,
            oldRate: user.rate,
            newRate,
            ageBonus,
            accountAgeDays,
          };
        }
        return null;
      })
    );

    // nullを除外して実際に更新されたユーザーのみを返す
    const updatedUsers = updates.filter(
      (update): update is NonNullable<typeof update> => update !== null
    );

    console.log(
      `Successfully updated ${updatedUsers.length} users' ratings based on account age`
    );

    return NextResponse.json({
      success: true,
      updatedUsers,
      updateCount: updatedUsers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Account Age Rating Update Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
