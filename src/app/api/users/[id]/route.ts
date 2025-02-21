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
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "profile";
    const cursor = searchParams.get("cursor");
    const limit = 20;

    // プロフィール情報の取得
    if (type === "profile") {
      const user = await prisma.user.findUnique({
        where: { id: params.id },
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

      // フォロー状態の確認
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
    }

    // 投稿の取得

    if (type === "posts") {
      const posts = await prisma.post.findMany({
        where: {
          userId: params.id,
          parentId: null,
        },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              icon: true,
            },
          },
          _count: {
            select: {
              replies: true,
              favoritedBy: true, // favorites を favoritedBy に変更
              repostedBy: true, // reposts を repostedBy に変更
            },
          },
          favoritedBy: session
            ? {
                where: { userId: session.user.id },
              }
            : false,
          repostedBy: session
            ? {
                where: { userId: session.user.id },
              }
            : false,
        },
      });

      const hasMore = posts.length > limit;
      const nextCursor = hasMore ? posts[limit - 1].id : undefined;
      const postList = hasMore ? posts.slice(0, -1) : posts;

      const formattedPosts = postList.map((post) => ({
        id: post.id,
        content: post.content,
        createdAt: post.createdAt,
        user: post.user,
        _count: {
          replies: post._count.replies,
          favorites: post._count.favoritedBy,
          reposts: post._count.repostedBy,
        },
        isFavorited: post.favoritedBy?.length > 0,
        isReposted: post.repostedBy?.length > 0,
      }));

      return NextResponse.json({
        posts: formattedPosts,
        hasMore,
        ...(nextCursor && { nextCursor }),
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("[User API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
