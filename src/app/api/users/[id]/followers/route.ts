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
    const cursor = searchParams.get("cursor");
    const limit = Number(searchParams.get("limit")) || 20;

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // フォロワー一覧を取得
    const followers = await prisma.follow.findMany({
      where: {
        followedId: params.id,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
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

    // 次ページの有無を確認
    const hasMore = followers.length > limit;
    const nextCursor = hasMore ? followers[limit - 1].id : undefined;
    const followerList = hasMore ? followers.slice(0, -1) : followers;

    // レスポンスデータの整形
    const response: UserFollowersResponse = {
      followers: followerList.map((follow) => ({
        id: follow.follower.id,
        username: follow.follower.username,
        icon: follow.follower.icon,
        profile: follow.follower.profile,
        followedAt: follow.createdAt,
        ...(session?.user && {
          isFollowing: follow.follower.followers.length > 0,
        }),
      })),
      hasMore,
      ...(nextCursor && { nextCursor }),
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
