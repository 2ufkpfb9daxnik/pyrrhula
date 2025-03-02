import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { TimelineResponse, CreatePostRequest } from "@/app/_types/post";
import { calculateRating } from "@/lib/rating";

const limit = 50;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    // 認証チェックを削除し、ユーザーIDを取得するだけに変更

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const since = searchParams.get("since");
    const includeReposts = searchParams.get("includeReposts") === "true";

    // 型を明示的に定義して互換性を確保
    type FormattedPost = {
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
        favoritedBy?: number;
        repostedBy?: number;
      };
      favoritedBy: { userId: string }[];
      // データベースから取得した拡散情報
      userRepostedData: { userId: string; createdAt?: Date }[];
      isReposted: boolean;
      isFavorited: boolean;
      repostedAt?: Date;
      // 拡散者情報 (オブジェクト形式)
      repostedByInfo?: {
        id: string;
        username: string;
        icon: string | null;
      };
    };

    // API応答用の型
    type ApiResponsePost = {
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
      repostedAt?: Date;
      // API応答では repostedBy を使用
      repostedBy?: {
        id: string;
        username: string;
        icon: string | null;
      };
    };

    // 1. 通常の投稿を取得
    const regularPosts = await prisma.post.findMany({
      where: {
        ...(since && {
          createdAt: {
            gt: new Date(since),
          },
        }),
      },
      take: includeReposts ? Math.floor(limit / 2) + 1 : limit + 1,
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
            favoritedBy: true,
            repostedBy: true,
          },
        },
        favoritedBy: userId
          ? {
              where: { userId },
              select: { userId: true },
            }
          : undefined,
        repostedBy: userId
          ? {
              where: { userId },
              select: { userId: true, createdAt: true },
            }
          : undefined,
      },
    });

    let allPosts: FormattedPost[] = regularPosts.map((post) => ({
      ...post,
      // ログインしていない場合はfalseに設定
      isReposted: userId ? post.repostedBy?.length > 0 || false : false,
      isFavorited: userId ? post.favoritedBy?.length > 0 || false : false,
      repostedAt:
        userId && post.repostedBy?.length > 0
          ? post.repostedBy[0].createdAt
          : undefined,
      parent: post.parent || null,
      // プロパティ名を完全に分けて重複を避ける
      // 非ログインの場合は空の配列を設定
      favoritedBy: post.favoritedBy || [],
      userRepostedData: post.repostedBy || [],
    }));

    // 2. 拡散された投稿を取得（includeRepostsが指定されている場合のみ）
    if (includeReposts) {
      console.log("全体タイムライン: 拡散投稿を取得します...");
      const repostCursor = searchParams.get("repostCursor");

      const reposts = await prisma.repost.findMany({
        where: {
          ...(since && {
            createdAt: {
              gt: new Date(since),
            },
          }),
        },
        take: Math.floor(limit / 2) + 1,
        skip: repostCursor ? 1 : 0,
        cursor: repostCursor ? { id: repostCursor } : undefined,
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
                  favoritedBy: true,
                  repostedBy: true,
                },
              },
              favoritedBy: userId
                ? {
                    where: { userId },
                    select: { userId: true },
                  }
                : undefined,
              repostedBy: userId
                ? {
                    where: { userId },
                    select: { userId: true, createdAt: true },
                  }
                : undefined,
            },
          },
        },
      });

      console.log(`全体タイムライン: ${reposts.length}件の拡散を取得しました`);

      // 拡散情報をフォーマット
      const repostedPosts: FormattedPost[] = reposts.map((repost) => {
        // 拡散者情報を設定
        const repostingUserInfo = {
          id: repost.user.id,
          username: repost.user.username,
          icon: repost.user.icon,
        };

        return {
          ...repost.post,
          id: repost.post.id,
          content: repost.post.content,
          createdAt: repost.post.createdAt,
          favorites: repost.post.favorites,
          reposts: repost.post.reposts,
          images: repost.post.images || [],
          user: repost.post.user,
          parent: repost.post.parent || null,
          _count: repost.post._count,
          // 非ログインの場合は空の配列を設定
          favoritedBy: repost.post.favoritedBy || [],
          // DB データは userRepostedData として保存
          userRepostedData: repost.post.repostedBy || [],
          repostedAt: repost.createdAt,
          isReposted: userId
            ? repost.post.repostedBy?.length > 0 || false
            : false,
          isFavorited: userId
            ? repost.post.favoritedBy?.length > 0 || false
            : false,
          // 拡散者情報を repostedByInfo として保存
          repostedByInfo: repostingUserInfo,
        };
      });

      // 日付でソート（拡散日時または投稿日時）
      allPosts.sort((a, b) => {
        const dateA = a.repostedAt || a.createdAt;
        const dateB = b.repostedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    }

    // 次ページの有無を確認
    const hasMore = allPosts.length > limit;
    const nextCursor = hasMore ? allPosts[limit - 1].id : undefined;
    const postList = hasMore ? allPosts.slice(0, limit) : allPosts;

    // レスポンスデータの整形
    const formattedPosts: ApiResponsePost[] = postList.map((post) => ({
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
      isFavorited: post.isFavorited,
      isReposted: post.isReposted,
      repostedAt: post.repostedAt,
      // API応答では統一されたプロパティ名 repostedBy を使用
      repostedBy: post.repostedByInfo,
    }));

    return NextResponse.json({
      posts: formattedPosts,
      hasMore,
      ...(nextCursor && { nextCursor }),
    });
  } catch (error) {
    console.error("[Whole Timeline Error]:", error);
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

    // トランザクションを使用して、投稿作成と統計更新を原子的に実行
    const result = await prisma.$transaction(async (prisma) => {
      // 1. 投稿を作成
      const post = await prisma.post.create({
        data: {
          content: body.content.trim(),
          userId: session.user.id,
          images: body.images || [],
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

      // 2. 統計情報の取得と更新
      const [
        postCount, // 総投稿数
        recentPosts, // 過去30日の投稿数
        recentReposts, // 過去30日の拡散数
        totalReposts, // 総拡散数
        recentFavoritesReceived, // 過去30日に受け取ったお気に入り
        favoritesReceived, // 受け取ったお気に入りの合計
        followersCount, // フォロワー数
      ] = await Promise.all([
        // 総投稿数
        prisma.post.count({
          where: { userId: session.user.id },
        }),

        // 過去30日の投稿数
        prisma.post.count({
          where: {
            userId: session.user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
            },
          },
        }),

        // 過去30日の拡散数
        prisma.repost.count({
          where: {
            userId: session.user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
            },
          },
        }),

        // 総拡散数
        prisma.repost.count({
          where: {
            userId: session.user.id,
          },
        }),

        // 過去30日に受け取ったお気に入り
        prisma.favorite.count({
          where: {
            post: {
              userId: session.user.id,
            },
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
            },
          },
        }),

        // 受け取ったお気に入りの合計
        prisma.favorite.count({
          where: {
            post: {
              userId: session.user.id,
            },
          },
        }),

        // フォロワー数
        prisma.follow.count({
          where: {
            followedId: session.user.id,
          },
        }),
      ]);

      // 3. レーティングの計算
      // 既存のレーティングカラー
      const ratingColor = calculateRating(recentPosts, postCount);

      // 拡張レーティングスコアの計算
      const baseScore =
        Math.min(recentPosts / 50, 1) * 70 + Math.min(postCount / 1000, 1) * 30;

      // 拡散やお気に入りによるボーナス
      const repostsBonus =
        Math.sqrt(totalReposts) * 2 + Math.sqrt(recentReposts) * 3;
      const favoritesBonus =
        Math.sqrt(favoritesReceived) * 2 +
        Math.sqrt(recentFavoritesReceived) * 3;
      const followersBonus = Math.sqrt(followersCount) * 5;

      // 計算されたレート値
      const calculatedRate = Math.floor(
        baseScore + repostsBonus + favoritesBonus + followersBonus
      );

      // 4. ユーザー情報を更新
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          postCount,
          rate: calculatedRate,
        },
      });

      return post;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[Create Post Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
