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
    const limit = 10;

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
      return NextResponse.json(user);
    }

    // フォロワー/フォロイーの取得を追加
    if (type === "followers" || type === "following") {
      const users = await prisma.user.findUnique({
        where: { id: params.id },
        select: {
          [type === "followers" ? "followers" : "following"]: {
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            select: {
              [type === "followers" ? "follower" : "followed"]: {
                select: {
                  id: true,
                  username: true,
                  icon: true,
                  postCount: true,
                  rate: true,
                  createdAt: true,
                  followersCount: true,
                  followingCount: true,
                  followers: session?.user
                    ? {
                        where: {
                          followerId: session.user.id,
                        },
                        select: {
                          followerId: true,
                        },
                      }
                    : undefined,
                },
              },
            },
          },
        },
      });

      if (!users) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const userList = users[
        type === "followers" ? "followers" : "following"
      ].map((follow: any) => {
        const userData =
          type === "followers" ? follow.follower : follow.followed;
        return {
          id: userData.id,
          username: userData.username,
          icon: userData.icon,
          postCount: userData.postCount,
          rate: userData.rate,
          createdAt: userData.createdAt,
          followersCount: userData.followersCount,
          followingCount: userData.followingCount,
          isFollowing: userData.followers?.length > 0,
        };
      });

      const hasMore = userList.length > limit;
      const nextCursor = hasMore ? userList[limit - 1].id : undefined;
      const formattedUsers = hasMore ? userList.slice(0, -1) : userList;

      return NextResponse.json({
        users: formattedUsers,
        hasMore,
        ...(nextCursor && { nextCursor }),
      });
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
        select: {
          id: true,
          content: true,
          createdAt: true,
          images: true, // 画像は文字列配列のフィールド
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
              favoritedBy: true,
              repostedBy: true,
            },
          },
          favoritedBy: session?.user
            ? {
                where: {
                  userId: session.user.id,
                },
                select: {
                  userId: true,
                },
              }
            : undefined,
          repostedBy: session?.user
            ? {
                where: {
                  userId: session.user.id,
                },
                select: {
                  userId: true,
                },
              }
            : undefined,
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
        images: post.images, // 画像情報を追加
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

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (session.user.id !== params.id) {
      return NextResponse.json(
        { error: "他のユーザーのプロフィールは編集できません" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, profile, icon } = body;

    // ユーザー名は必須、プロフィールとアイコンは空でも可
    if (!username || username.trim() === "") {
      return NextResponse.json(
        { error: "ユーザー名は必須です" },
        { status: 400 }
      );
    }

    // 更新データを準備
    const updateData: {
      username: string;
      profile?: string | null;
      icon?: string | null;
    } = {
      username: username.trim(),
    };

    // プロフィールフィールド - 明示的にnullも許可
    if (profile !== undefined) {
      updateData.profile = profile || null;
    }

    // アイコンフィールド - 明示的にnullも許可
    if (icon !== undefined) {
      updateData.icon = icon || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        icon: true,
        profile: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("[User Update Error]:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
