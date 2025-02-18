// users/[id]/mute         POST/DELETE         ユーザーのミュート/解除
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// ユーザーをミュートする
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 自分自身をミュートできない
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: "Cannot mute yourself" },
        { status: 400 }
      );
    }

    // ミュート対象のユーザーが存在するか確認
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ミュートを作成
    await prisma.mute.create({
      data: {
        muterId: session.user.id,
        mutedId: params.id,
      },
    });

    return NextResponse.json(
      { message: "User muted successfully" },
      { status: 200 }
    );
  } catch (error) {
    // ユニーク制約違反（既にミュート済み）
    if ((error as any).code === "P2002") {
      return NextResponse.json({ error: "Already muted" }, { status: 400 });
    }

    console.error("[Mute User Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ミュートを解除する
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ミュートを解除
    await prisma.mute.delete({
      where: {
        muterId_mutedId: {
          muterId: session.user.id,
          mutedId: params.id,
        },
      },
    });

    return NextResponse.json(
      { message: "Mute removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    // ミュートが存在しない場合
    if ((error as any).code === "P2025") {
      return NextResponse.json({ error: "Mute not found" }, { status: 404 });
    }

    console.error("[Unmute User Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
