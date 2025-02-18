// search/                 GET                 検索する
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { SearchQuery, SearchResponse } from "@/app/_types/search";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // 基本的なパラメータを取得
    const query: SearchQuery = {
      q: searchParams.get("q") || undefined,
      from: searchParams.get("from") || undefined,
      since: searchParams.get("since") || undefined,
      until: searchParams.get("until") || undefined,
      replyTo: searchParams.get("replyTo") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit: Number(searchParams.get("limit")) || 20,
    };

    // お気に入り数の条件
    const favGt = searchParams.get("fav_gt");
    const favLt = searchParams.get("fav_lt");
    if (favGt || favLt) {
      query.favorites = {
        ...(favGt && { gt: parseInt(favGt) }),
        ...(favLt && { lt: parseInt(favLt) }),
      };
    }

    // リポスト数の条件
    const repGt = searchParams.get("rep_gt");
    const repLt = searchParams.get("rep_lt");
    if (repGt || repLt) {
      query.reposts = {
        ...(repGt && { gt: parseInt(repGt) }),
        ...(repLt && { lt: parseInt(repLt) }),
      };
    }

    // 検索条件を構築
    const where = {
      AND: [
        // キーワード検索
        ...(query.q
          ? [
              {
                content: {
                  contains: query.q,
                  mode: "insensitive" as const,
                },
              },
            ]
          : []),

        // 特定のユーザーからの投稿
        ...(query.from
          ? [
              {
                userId: query.from,
              },
            ]
          : []),

        // 日時による絞り込み
        ...(query.since || query.until
          ? [
              {
                createdAt: {
                  ...(query.since && { gte: new Date(query.since) }),
                  ...(query.until && { lte: new Date(query.until) }),
                },
              },
            ]
          : []),

        // お気に入り数による絞り込み
        ...(query.favorites
          ? [
              {
                favorites: {
                  ...(query.favorites.gt && { gt: query.favorites.gt }),
                  ...(query.favorites.lt && { lt: query.favorites.lt }),
                },
              },
            ]
          : []),

        // リポスト数による絞り込み
        ...(query.reposts
          ? [
              {
                reposts: {
                  ...(query.reposts.gt && { gt: query.reposts.gt }),
                  ...(query.reposts.lt && { lt: query.reposts.lt }),
                },
              },
            ]
          : []),

        // 特定の投稿への返信
        ...(query.replyTo
          ? [
              {
                parentId: query.replyTo,
              },
            ]
          : []),
      ],
    };

    // 投稿を検索
    const posts = await prisma.post.findMany({
      where,
      take: (query.limit ?? 20) + 1,
      skip: query.cursor ? 1 : 0,
      cursor: query.cursor ? { id: query.cursor } : undefined,
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

    // 次ページの有無を確認
    const hasMore = posts.length > (query.limit ?? 20);
    const nextCursor = hasMore ? posts[(query.limit ?? 20) - 1].id : undefined;
    const postList = hasMore ? posts.slice(0, -1) : posts;

    const response: SearchResponse = {
      posts: postList,
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Search Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
