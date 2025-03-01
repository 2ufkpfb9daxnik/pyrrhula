import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { updateUserStats } from "@/lib/user-stats";

// フォローする
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetUserId = params.id;

    if (session.user.id === targetUserId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // トランザクションで全ての操作を実行
    const result = await prisma.$transaction(async (prisma) => {
      // フォロー対象ユーザーの存在確認
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      // フォロー作成
      const follow = await prisma.follow.create({
        data: {
          followerId: session.user.id,
          followedId: targetUserId,
        },
      });

      // 通知作成
      await prisma.notification.create({
        data: {
          type: "fol",
          senderId: session.user.id,
          receiverId: targetUserId,
        },
      });

      // フォロワー数とフォロー数を更新
      await Promise.all([
        prisma.user.update({
          where: { id: targetUserId },
          data: {
            followersCount: { increment: 1 },
          },
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data: {
            followingCount: { increment: 1 },
          },
        }),
      ]);

      return follow;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if ((error as any).code === "P2002") {
      return NextResponse.json(
        { error: "Already following this user" },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.error("[Follow Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// フォロー解除
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetUserId = params.id;

    // トランザクションで全ての操作を実行
    const result = await prisma.$transaction(async (prisma) => {
      // フォロー関係を削除
      const follow = await prisma.follow.delete({
        where: {
          followerId_followedId: {
            followerId: session.user.id,
            followedId: targetUserId,
          },
        },
      });

      // フォロワー数とフォロー数を更新
      await Promise.all([
        prisma.user.update({
          where: { id: targetUserId },
          data: {
            followersCount: { decrement: 1 },
          },
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data: {
            followingCount: { decrement: 1 },
          },
        }),
      ]);

      return follow;
    });

    return NextResponse.json(result);
  } catch (error) {
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

// ユーザー情報を取得
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "rate";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const totalUsers = await prisma.user.count();

    const users = await prisma.user.findMany({
      take: limit,
      skip: skip,
      orderBy: {
        [sort]: "desc",
      },
      select: {
        id: true,
        username: true,
        icon: true,
        rate: true,
        postCount: true,
        createdAt: true,
        followers: session?.user
          ? {
              where: {
                followerId: session.user.id,
              },
            }
          : undefined,
      },
    });

    const formattedUsers = users.map((user) => ({
      ...user,
      isFollowing: user.followers?.length > 0,
      followers: undefined,
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit),
        currentPage: page,
        hasMore: page * limit < totalUsers,
      },
    });
  } catch (error) {
    console.error("[Users Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
