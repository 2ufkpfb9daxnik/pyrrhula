import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { CreatePostRequest } from "@/app/_types/post";

const limit = 50;

// 投稿一覧を取得
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const since = searchParams.get("since");
    const includeReposts = searchParams.get("includeReposts") === "true";
    const countOnly = searchParams.get("countOnly") === "true";

    const followings = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
      },
      select: {
        followedId: true,
      },
    });

    const followingIds = followings.map((f) => f.followedId);
    followingIds.push(session.user.id); // 自分のIDも含める

    // カウントのみが要求された場合（自動更新用）
    if (countOnly && since) {
      const sinceDate = new Date(since);

      // 通常投稿のカウント
      const postsCount = await prisma.post.count({
        where: {
          userId: { in: followingIds },
          createdAt: {
            gt: sinceDate,
          },
        },
      });

      // リポストのカウント（includeRepostsが有効な場合のみ）
      let repostsCount = 0;
      if (includeReposts) {
        repostsCount = await prisma.repost.count({
          where: {
            userId: { in: followingIds },
            createdAt: {
              gt: sinceDate,
            },
          },
        });
      }

      // 新しい投稿の合計数を返す
      return NextResponse.json({
        count: postsCount + repostsCount,
        timestamp: new Date(),
      });
    }

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
        userId: { in: followingIds },
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
        favoritedBy: {
          where: { userId: session.user.id },
          select: { userId: true },
        },
        repostedBy: {
          where: { userId: session.user.id },
          select: { userId: true, createdAt: true },
        },
      },
    });

    let allPosts: FormattedPost[] = regularPosts.map((post) => ({
      ...post,
      isReposted: post.repostedBy.length > 0,
      isFavorited: post.favoritedBy.length > 0,
      repostedAt:
        post.repostedBy.length > 0 ? post.repostedBy[0].createdAt : undefined,
      parent: post.parent || null,
      // プロパティ名を完全に分けて重複を避ける
      userRepostedData: post.repostedBy,
    }));

    // 2. 拡散された投稿を取得
    if (includeReposts) {
      const repostCursor = searchParams.get("repostCursor");

      const reposts = await prisma.repost.findMany({
        where: {
          userId: { in: followingIds },
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
              favoritedBy: {
                where: { userId: session.user.id },
                select: { userId: true },
              },
              repostedBy: {
                where: { userId: session.user.id },
                select: { userId: true, createdAt: true },
              },
            },
          },
        },
      });

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
          favoritedBy: repost.post.favoritedBy,
          // DB データは userRepostedData として保存
          userRepostedData: repost.post.repostedBy,
          repostedAt: repost.createdAt,
          isReposted: repost.post.repostedBy.length > 0,
          isFavorited: repost.post.favoritedBy.length > 0,
          // 拡散者情報を repostedByInfo として保存
          repostedByInfo: repostingUserInfo,
        };
      });

      // 通常の投稿と拡散を結合
      allPosts = [...allPosts, ...repostedPosts];

      // 重複を除去（同じ投稿が通常の投稿と拡散で2回表示されないようにする）部分を修正
      const seenIds = new Set<string>();
      allPosts = allPosts.filter((post) => {
        // 自分の拡散も含めて全て表示する（フィルタリングをしない）
        // 拡散されている投稿を特定するためのユニークキーを作成
        const postKey = post.repostedByInfo
          ? `${post.id}-repost-${post.repostedByInfo.id}`
          : post.id;

        // 完全に同じ投稿（同じIDかつ同じ拡散者）の場合のみ除外
        if (seenIds.has(postKey)) {
          console.log(`重複を検出: ${postKey}`);
          return false;
        }

        seenIds.add(postKey);
        return true;
      });

      // 日付でソート
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
        user, // ユーザー情報（アカウント作成日を取得するため）
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

        // ユーザー情報を取得（アカウント作成日を取得するため）
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { createdAt: true },
        }),
      ]);

      // アカウント年齢（日数）を計算
      const accountAgeDays = user?.createdAt
        ? Math.floor(
            (Date.now() - new Date(user.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      // 3. 新しい計算式に基づくレーティング計算
      const calculatedRate = Math.floor(
        recentPosts * 10 + // 直近30日の投稿数 × 10
          Math.sqrt(postCount) * 15 + // 過去の投稿の平方根 × 15
          recentReposts * 5 + // 直近30日の拡散数 × 5
          Math.sqrt(totalReposts) * 7 + // 総拡散数の平方根 × 7
          Math.sqrt(recentFavoritesReceived) * 8 + // 直近30日のお気に入り数の平方根 × 8
          Math.sqrt(favoritesReceived) * 5 + // 総お気に入り数の平方根 × 5
          Math.sqrt(followersCount) * 10 + // フォロワー数の平方根 × 10
          Math.log(accountAgeDays + 1) * 5 // アカウント作成からの日数（対数） × 5
      );

      // ログを出力（トラブルシューティング用）
      console.log(
        `[Rating] ユーザー: ${session.user.id}, 投稿数: 最近=${recentPosts}、総数=${postCount}`
      );
      console.log(
        `[Rating] 拡散数: 最近=${recentReposts}、総数=${totalReposts}`
      );
      console.log(
        `[Rating] お気に入り: 最近=${recentFavoritesReceived}、総数=${favoritesReceived}`
      );
      console.log(
        `[Rating] フォロワー数: ${followersCount}、アカウント年齢(日): ${accountAgeDays}`
      );
      console.log(`[Rating] 計算されたレート: ${calculatedRate}`);

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
