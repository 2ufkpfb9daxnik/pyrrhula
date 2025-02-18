// users/[id]/block        POST/DELETE         ユーザーのブロック/解除
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// ユーザーをブロックする
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 自分自身をブロックできない
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: "Cannot block yourself" },
        { status: 400 }
      );
    }

    // ブロック対象のユーザーが存在するか確認
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // トランザクションでブロックとフォロー解除を実行
    await prisma.$transaction([
      // ブロックを作成
      prisma.block.create({
        data: {
          blockerId: session.user.id,
          blockedId: params.id,
        },
      }),
      // 相互のフォロー関係を解除
      prisma.follow.deleteMany({
        where: {
          OR: [
            {
              followerId: session.user.id,
              followedId: params.id,
            },
            {
              followerId: params.id,
              followedId: session.user.id,
            },
          ],
        },
      }),
    ]);

    return NextResponse.json(
      { message: "User blocked successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Block User Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ブロックを解除する
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ブロックを解除
    await prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: params.id,
        },
      },
    });

    return NextResponse.json(
      { message: "Block removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    // ブロックが存在しない場合
    if ((error as any).code === "P2025") {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    console.error("[Unblock User Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
