// users/[id]/follwing     GET                 そのユーザーのフォロイー取得
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

    // フォロー中のユーザー一覧を取得
    const following = await prisma.follow.findMany({
      where: {
        followerId: params.id, // フォロワーの代わりにフォロー中を取得
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        followed: {
          // followerの代わりにfollowedを取得
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
    const hasMore = following.length > limit;
    const nextCursor = hasMore ? following[limit - 1].id : undefined;
    const followingList = hasMore ? following.slice(0, -1) : following;

    // レスポンスデータの整形
    const response: UserFollowersResponse = {
      followers: followingList.map((follow) => ({
        id: follow.followed.id,
        username: follow.followed.username,
        icon: follow.followed.icon,
        profile: follow.followed.profile,
        followedAt: follow.createdAt,
        ...(session?.user && {
          isFollowing: follow.followed.followers.length > 0,
        }),
      })),
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[User Following Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
