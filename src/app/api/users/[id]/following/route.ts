// users/[id]/following     GET                 そのユーザーのフォロイー取得
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserFollowersResponse } from "@/app/_types/follow";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);

    // ページネーションパラメータを取得
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 5; // デフォルト値を5に変更
    const skip = (page - 1) * limit;

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 総フォロー数を取得
    const totalCount = await prisma.follow.count({
      where: {
        followerId: params.id,
      },
    });

    // フォロー中のユーザー一覧を取得
    const following = await prisma.follow.findMany({
      where: {
        followerId: params.id,
      },
      take: limit,
      skip: skip,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        followed: {
          select: {
            id: true,
            username: true,
            icon: true,
            profile: true,
            followers: session?.user
              ? {
                  where: {
                    followerId: session.user.id,
                  },
                  select: {
                    id: true,
                  },
                }
              : false,
          },
        },
      },
    });

    // レスポンスデータの整形
    const formattedFollowing = following.map((follow) => ({
      id: follow.followed.id,
      username: follow.followed.username,
      icon: follow.followed.icon,
      profile: follow.followed.profile,
      followedAt: follow.createdAt,
      ...(session?.user && {
        isFollowing: follow.followed.followers?.length > 0,
      }),
    }));

    // 新しいレスポンスフォーマット
    return NextResponse.json({
      followers: formattedFollowing, // 互換性のためfollowersキーを使用
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("[User Following Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
