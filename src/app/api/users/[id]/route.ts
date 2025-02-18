// users/[id]/             GET/POST/PUT        ユーザー詳細取得/もし自分ならユーザーのプロフィール初期設定/変更
// ユーザー詳細とは、ユーザーのプロフィール画像、プロフィール(bio)、ユーザー名、ユーザーの投稿数、ユーザーのレート、ユーザーの作成日時、ユーザーのフォロワー数、フォロイー数を含む
// ユーザーのプロフィール画像は、ユーザーが設定していない場合はnull
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserDetailResponse } from "@/app/_types/users";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // ユーザーの基本情報を取得
    const user = await prisma.user.findUnique({
      where: {
        id: params.id,
      },
      select: {
        id: true,
        username: true,
        icon: true,
        profile: true,
        postCount: true,
        rate: true,
        createdAt: true,
        followersCount: true,
        followingCount: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ログインユーザーがこのユーザーをフォローしているか確認
    let isFollowing = false;
    if (session?.user) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followedId: {
            followerId: session.user.id,
            followedId: params.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    const response: UserDetailResponse = {
      ...user,
      ...(session?.user && { isFollowing }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[User Detail Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
