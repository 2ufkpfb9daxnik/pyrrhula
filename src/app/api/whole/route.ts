import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { TimelineResponse, CreatePostRequest } from "@/app/_types/post";

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
      // 質問情報を追加
      question?: {
        id: string;
        question: string;
        answer: string | null;
        targetUserId: string;
        targetUser: {
          username: string;
          icon: string | null;
        };
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
      // 質問情報を追加
      question?: {
        id: string;
        question: string;
        answer: string | null;
        targetUserId: string;
        targetUser: {
          username: string;
          icon: string | null;
        };
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
        // 質問情報を取得
        Question: {
          take: 1, // 最初の関連質問のみを取得
          select: {
            id: true,
            question: true,
            answer: true,
            targetUserId: true,
            User_Question_targetUserIdToUser: {
              select: {
                username: true,
                icon: true,
              },
            },
          },
        },
      },
    });

    let allPosts: FormattedPost[] = regularPosts.map((post) => {
      // 質問情報を整形
      const question =
        post.Question && post.Question.length > 0
          ? {
              id: post.Question[0].id,
              question: post.Question[0].question,
              answer: post.Question[0].answer,
              targetUserId: post.Question[0].targetUserId,
              targetUser: {
                username:
                  post.Question[0].User_Question_targetUserIdToUser.username,
                icon: post.Question[0].User_Question_targetUserIdToUser.icon,
              },
            }
          : undefined;

      return {
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
        // 質問情報を追加
        question,
      };
    });

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
              // 質問情報を取得
              Question: {
                take: 1,
                select: {
                  id: true,
                  question: true,
                  answer: true,
                  targetUserId: true,
                  User_Question_targetUserIdToUser: {
                    select: {
                      username: true,
                      icon: true,
                    },
                  },
                },
              },
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

        // 質問情報を整形
        const question =
          repost.post.Question && repost.post.Question.length > 0
            ? {
                id: repost.post.Question[0].id,
                question: repost.post.Question[0].question,
                answer: repost.post.Question[0].answer,
                targetUserId: repost.post.Question[0].targetUserId,
                targetUser: {
                  username:
                    repost.post.Question[0].User_Question_targetUserIdToUser
                      .username,
                  icon: repost.post.Question[0].User_Question_targetUserIdToUser
                    .icon,
                },
              }
            : undefined;

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
          // 質問情報を追加
          question,
        };
      });

      allPosts = [...allPosts, ...repostedPosts];

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
      // 質問情報を追加
      question: post.question,
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

        // ユーザー情報を取得（アカウント作成日を取得）
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

      // 3. レーティングの計算 - 新しい計算式に基づく
      const calculatedRate = Math.floor(
        recentPosts * 10 + // 直近30日の投稿数 × 10
          Math.sqrt(postCount) * 15 + // 総投稿数の平方根 × 15
          recentReposts * 5 + // 直近30日の拡散数 × 5
          Math.sqrt(totalReposts) * 7 + // 総拡散数の平方根 × 7
          Math.sqrt(recentFavoritesReceived) * 8 + // 直近30日のお気に入り数の平方根 × 8
          Math.sqrt(favoritesReceived) * 5 + // 総お気に入り数の平方根 × 5
          Math.sqrt(followersCount) * 10 + // フォロワー数の平方根 × 10
          Math.log(accountAgeDays + 1) * 5 // アカウント作成からの日数（対数） × 5
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
