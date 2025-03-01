// users/[id]/followers    GET                 そのユーザーのフォロワー取得
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

    // 総フォロワー数を取得
    const totalCount = await prisma.follow.count({
      where: {
        followedId: params.id,
      },
    });

    // フォロワー一覧を取得
    const followers = await prisma.follow.findMany({
      where: {
        followedId: params.id,
      },
      take: limit,
      skip: skip,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        follower: {
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
    const response: UserFollowersResponse & { totalCount: number } = {
      followers: followers.map((follow) => ({
        id: follow.follower.id,
        username: follow.follower.username,
        icon: follow.follower.icon,
        profile: follow.follower.profile,
        followedAt: follow.createdAt,
        ...(session?.user && {
          isFollowing: follow.follower.followers.length > 0,
        }),
      })),
      hasMore: skip + limit < totalCount,
      totalCount, // 総フォロワー数を追加
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[User Followers Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
