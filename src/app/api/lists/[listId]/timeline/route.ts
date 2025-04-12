//  api/lists/[listId]/timeline/route.ts
// GET リストのタイムライン取得
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// クエリパラメータのバリデーションスキーマ
const timelineParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  includeReposts: z.coerce.boolean().default(true),
});

export async function GET(
  req: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const validatedParams = timelineParamsSchema.parse(
      Object.fromEntries(searchParams)
    );

    // リストの存在確認と設定の取得
    const list = await prisma.lists.findUnique({
      where: { id: params.listId },
      select: {
        include_timeline_posts: true,
        list_members: {
          where: { status: "approved" },
          select: { user_id: true },
        },
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: "リストが見つかりません" },
        { status: 404 }
      );
    }

    // メンバーのユーザーID一覧
    const memberUserIds = list.list_members.map((member) => member.user_id);

    // 投稿一覧の取得
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          // リスト専用の投稿
          { list_id: params.listId },
          // メンバーの通常の投稿（リストの設定に応じて）
          ...(list.include_timeline_posts
            ? [
                {
                  userId: { in: memberUserIds },
                  list_id: null,
                },
              ]
            : []),
        ],
        // リポストの条件
        ...(validatedParams.includeReposts ? {} : { repostedByUserId: null }),
      },
      take: validatedParams.limit + 1,
      ...(validatedParams.cursor && {
        cursor: { id: validatedParams.cursor },
        skip: 1,
      }),
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
        users: validatedParams.includeReposts
          ? {
              select: {
                id: true,
                raw_user_meta_data: true,
              },
            }
          : false,
        _count: {
          select: {
            replies: true,
            favoritedBy: true,
            repostedBy: true,
          },
        },
        parent: {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // ページネーション情報の処理
    const hasMore = posts.length > validatedParams.limit;
    const data = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;

    // いいね・リポスト情報の取得（ログイン中の場合）
    let favorites: Array<{ postId: string }> = [];
    let reposts: Array<{ postId: string }> = [];

    if (session?.user?.id) {
      const postIds = data.map((post) => post.id);
      [favorites, reposts] = await prisma.$transaction([
        prisma.favorite.findMany({
          where: {
            postId: { in: postIds },
            userId: session.user.id,
          },
          select: { postId: true },
        }),
        prisma.repost.findMany({
          where: {
            postId: { in: postIds },
            userId: session.user.id,
          },
          select: { postId: true },
        }),
      ]);
    }

    // レスポンスの整形
    const formattedPosts = data.map((post) => ({
      ...post,
      isFavorited: favorites.some((f) => f.postId === post.id),
      isReposted: reposts.some((r) => r.postId === post.id),
    }));

    return NextResponse.json({
      posts: formattedPosts,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error("[リストタイムライン取得エラー]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "クエリパラメータが不正です", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "タイムラインの取得に失敗しました" },
      { status: 500 }
    );
  }
}
