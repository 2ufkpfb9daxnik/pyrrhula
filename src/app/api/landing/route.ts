import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const limit = 20; // ランディングページ用に制限を少なくする

export const dynamic = "force-dynamic";
export const revalidate = 60; // キャッシュ時間を1分に設定

// APIから返すポストの型定義
type LandingPost = {
  id: string;
  content: string;
  createdAt: Date;
  favorites: number;
  reposts: number;
  images: string[];
  user: {
    id: string;
    username: string;
    icon: string | null;
  };
  parent: {
    id: string;
    content: string;
    user?: {
      id: string;
      username: string;
    };
  } | null;
  _count: {
    replies: number;
  };
  isFavorited: boolean;
  isReposted: boolean;
  repostedAt?: Date; // オプショナルプロパティとして定義
  repostedBy?: {
    // オプショナルプロパティとして定義
    id: string;
    username: string;
    icon: string | null;
  };
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");

    // 認証チェックなしで投稿を取得
    const regularPosts = await prisma.post.findMany({
      where: {},
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        favorites: true,
        reposts: true,
        images: true,
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
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    // 拡散投稿も取得（ただし最大10件まで）
    const reposts = await prisma.repost.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            favorites: true,
            reposts: true,
            images: true,
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
            _count: {
              select: {
                replies: true,
              },
            },
          },
        },
      },
    });

    // 投稿と拡散を結合
    let allPosts: LandingPost[] = regularPosts.map((post) => ({
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      favorites: post.favorites,
      reposts: post.reposts,
      images: post.images || [],
      user: post.user,
      parent: post.parent || null,
      _count: {
        replies: post._count.replies,
      },
      isFavorited: false,
      isReposted: false,
    }));

    // 拡散投稿を変換して追加
    const repostedPosts = reposts.map((repost) => ({
      id: repost.post.id,
      content: repost.post.content,
      createdAt: repost.post.createdAt,
      favorites: repost.post.favorites,
      reposts: repost.post.reposts,
      images: repost.post.images || [],
      user: repost.post.user,
      parent: repost.post.parent || null,
      _count: {
        replies: repost.post._count.replies,
      },
      isFavorited: false,
      isReposted: false,
      repostedAt: repost.createdAt,
      // 拡散者情報を追加
      repostedBy: {
        id: repost.user.id,
        username: repost.user.username,
        icon: repost.user.icon,
      },
    }));

    // 拡散投稿を追加
    allPosts = [...allPosts, ...repostedPosts];

    // 日付でソート（拡散日時または投稿日時）
    allPosts.sort((a, b) => {
      const dateA = a.repostedAt || a.createdAt;
      const dateB = b.repostedAt || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // 次ページの有無を確認
    const hasMore = allPosts.length > limit;
    const nextCursor = hasMore ? allPosts[limit - 1].id : undefined;
    const postList = hasMore ? allPosts.slice(0, limit) : allPosts;

    // 重複する投稿を除去（同じ投稿IDが拡散投稿と通常投稿で重複することを防ぐ）
    const uniquePosts = postList.filter((post, index, self) => {
      // 拡散された投稿は常に残す
      if (post.repostedBy) return true;

      // 通常の投稿は、それが他の誰かによって拡散されていない場合のみ残す
      const isRepostedElsewhere = self.some(
        (p) => p.repostedBy && p.id === post.id
      );
      return !isRepostedElsewhere;
    });

    return NextResponse.json({
      posts: uniquePosts,
      hasMore,
      ...(nextCursor && { nextCursor }),
    });
  } catch (error) {
    console.error("[Landing Page API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
