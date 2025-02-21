// posts/                  GET/POST            投稿する/見る(supabase/next.js(vercel)/reactでリアルタイムに画面更新)
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { TimelineResponse, CreatePostRequest } from "@/app/_types/post";

// 投稿一覧を取得
export async function GET(req: Request) {
  try {
    console.log("タイムライン取得開始");
    const session = await getServerSession(authOptions);
    console.log("セッション状態:", session ? "ログイン中" : "未ログイン");

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 20;

    // フォローしているユーザーのIDを取得
    const following = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
      },
      select: {
        followedId: true,
      },
    });

    const followingIds = following.map((f) => f.followedId);
    // 自分の投稿も含める
    followingIds.push(session.user.id);

    // フォローしているユーザーの投稿を取得
    const posts = await prisma.post.findMany({
      where: {
        userId: {
          in: followingIds,
        },
        parentId: null, // トップレベルの投稿のみ
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
        parent: true,
        _count: {
          select: {
            replies: true,
            favoritedBy: true,
            repostedBy: true,
          },
        },
        favoritedBy: {
          where: { userId: session.user.id },
          select: { userId: true },
        },
        repostedBy: {
          where: { userId: session.user.id },
          select: { userId: true },
        },
      },
    });

    // 次ページの有無を確認
    const hasMore = posts.length > limit;
    const nextCursor = hasMore ? posts[limit - 1].id : undefined;
    const postList = hasMore ? posts.slice(0, -1) : posts;

    // レスポンスデータの整形
    const formattedPosts = postList.map((post) => ({
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      favorites: post.favorites,
      reposts: post.reposts,
      user: post.user,
      parent: post.parent
        ? {
            id: post.parent.id,
            content: post.parent.content,
            user: {
              id: post.parent.userId,
              username: "", // Need to fetch this from the parent post's user
            },
          }
        : null,
      _count: post._count,
      ...(session?.user && {
        isFavorited: post.favoritedBy.length > 0,
        isReposted: post.repostedBy.length > 0,
      }),
    }));

    const response: TimelineResponse = {
      posts: formattedPosts,
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Timeline Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 新規投稿を作成
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreatePostRequest = await req.json();

    // 投稿内容のバリデーション
    if (!body.content.trim()) {
      return NextResponse.json(
        { error: "Content cannot be empty" },
        { status: 400 }
      );
    }

    // 投稿を作成
    const post = await prisma.post.create({
      data: {
        content: body.content.trim(),
        userId: session.user.id,
        ...(body.parentId && { parentId: body.parentId }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("[Create Post Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
