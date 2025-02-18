// follow/                 POST/DELETE         フォローする/フォロー解除
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { FollowRequest } from "@/app/_types/follow";

// フォローする
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: FollowRequest = await req.json();

    // 自分自身をフォローできない
    if (session.user.id === body.userId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // フォロー対象ユーザーの存在確認
    const targetUser = await prisma.user.findUnique({
      where: { id: body.userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // トランザクションでフォローと通知を作成
    const [follow, _] = await prisma.$transaction([
      // フォロー作成
      prisma.follow.create({
        data: {
          followerId: session.user.id,
          followedId: body.userId,
        },
      }),
      // フォロー通知作成
      prisma.notification.create({
        data: {
          type: "fol",
          senderId: session.user.id,
          receiverId: body.userId,
        },
      }),
    ]);

    return NextResponse.json(follow, { status: 201 });
  } catch (error) {
    // ユニーク制約違反（既にフォロー済み）
    if ((error as any).code === "P2002") {
      return NextResponse.json(
        { error: "Already following this user" },
        { status: 409 }
      );
    }

    console.error("[Follow Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// フォロー解除
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // フォロー関係を削除
    const follow = await prisma.follow.delete({
      where: {
        followerId_followedId: {
          followerId: session.user.id,
          followedId: userId,
        },
      },
    });

    return NextResponse.json(follow);
  } catch (error) {
    // レコードが見つからない（フォローしていない）
    if ((error as any).code === "P2025") {
      return NextResponse.json(
        { error: "Not following this user" },
        { status: 404 }
      );
    }

    console.error("[Unfollow Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
