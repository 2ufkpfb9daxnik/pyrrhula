import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { CreatePostRequest } from "@/app/_types/post";
import { createRatingHistory, RATING_REASONS } from "@/lib/rating";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type TimingEntry = {
  name: string;
  dur: number;
};

const buildServerTimingHeader = (timings: TimingEntry[]): string =>
  timings.map((t) => `${t.name};dur=${t.dur.toFixed(1)}`).join(", ");

const timed = async <T>(
  timings: TimingEntry[],
  name: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const start = performance.now();
  const result = await fn();
  timings.push({ name, dur: performance.now() - start });
  return result;
};

// 投稿一覧を取得
export async function GET(req: Request) {
  const timings: TimingEntry[] = [];
  const totalStart = performance.now();

  try {
    const session = await timed(timings, "session", () =>
      getServerSession(authOptions),
    );
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const since = searchParams.get("since");
    const requestedLimit = Number(searchParams.get("limit"));
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, requestedLimit))
      : DEFAULT_LIMIT;
    const includeReposts = searchParams.get("includeReposts") === "true";
    const countOnly = searchParams.get("countOnly") === "true";
    const regularTake = limit + 1;
    const repostTake = limit + 1;
    const timelineCursorDate =
      includeReposts && cursor && !Number.isNaN(new Date(cursor).getTime())
        ? new Date(cursor)
        : undefined;

    const followings = await timed(timings, "followings", () =>
      prisma.follow.findMany({
        where: {
          followerId: session.user.id,
        },
        select: {
          followedId: true,
        },
      }),
    );

    const followingIds = followings.map((f) => f.followedId);
    followingIds.push(session.user.id);

    if (countOnly && since) {
      const sinceDate = new Date(since);
      const postsCountPromise = prisma.post.count({
        where: {
          userId: { in: followingIds },
          createdAt: {
            gt: sinceDate,
          },
        },
      });
      const repostsCountPromise = includeReposts
        ? prisma.repost.count({
            where: {
              userId: { in: followingIds },
              createdAt: {
                gt: sinceDate,
              },
            },
          })
        : Promise.resolve(0);

      const [postsCount, repostsCount] = await timed(timings, "countOnly", () =>
        Promise.all([postsCountPromise, repostsCountPromise]),
      );

      const countResponse = NextResponse.json({
        count: postsCount + repostsCount,
        timestamp: new Date(),
      });
      timings.push({ name: "total", dur: performance.now() - totalStart });
      countResponse.headers.set(
        "Server-Timing",
        buildServerTimingHeader(timings),
      );
      return countResponse;
    }

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
      };
      isReposted: boolean;
      isFavorited: boolean;
      repostedAt?: Date;
      repostedByInfo?: {
        id: string;
        username: string;
        icon: string | null;
      };
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
      repostedBy?: {
        id: string;
        username: string;
        icon: string | null;
      };
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

    const regularPostsPromise = prisma.post.findMany({
      where: {
        userId: { in: followingIds },
        ...(since && {
          createdAt: {
            gt: new Date(since),
          },
        }),
        ...(timelineCursorDate && {
          createdAt: {
            lt: timelineCursorDate,
          },
        }),
      },
      take: regularTake,
      skip: includeReposts ? 0 : cursor ? 1 : 0,
      cursor: includeReposts ? undefined : cursor ? { id: cursor } : undefined,
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
    });

    const repostsPromise = includeReposts
      ? prisma.repost.findMany({
          where: {
            userId: { in: followingIds },
            ...(since && {
              createdAt: {
                gt: new Date(since),
              },
            }),
            ...(timelineCursorDate && {
              createdAt: {
                lt: timelineCursorDate,
              },
            }),
          },
          take: repostTake,
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
        })
      : Promise.resolve([] as any[]);

    const [regularPosts, reposts] = await timed(timings, "timelineDb", () =>
      Promise.all([regularPostsPromise, repostsPromise]),
    );

    const formatStart = performance.now();
    let allPosts: FormattedPost[] = regularPosts.map((post) => {
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
        isReposted: false,
        isFavorited: false,
        repostedAt: undefined,
        parent: post.parent || null,
        question,
      };
    });

    if (includeReposts) {
      const repostedPosts: FormattedPost[] = reposts.map((repost) => {
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
          repostedAt: repost.createdAt,
          isReposted: false,
          isFavorited: false,
          repostedByInfo: {
            id: repost.user.id,
            username: repost.user.username,
            icon: repost.user.icon,
          },
          question,
        };
      });

      allPosts = [...allPosts, ...repostedPosts];

      const seenIds = new Set<string>();
      allPosts = allPosts.filter((post) => {
        const postKey = post.repostedByInfo
          ? `${post.id}-repost-${post.repostedByInfo.id}`
          : post.id;

        if (seenIds.has(postKey)) {
          return false;
        }

        seenIds.add(postKey);
        return true;
      });

      allPosts.sort((a, b) => {
        const dateA = a.repostedAt || a.createdAt;
        const dateB = b.repostedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    }
    timings.push({ name: "format", dur: performance.now() - formatStart });

    const hasMore = allPosts.length > limit;
    const nextCursor = hasMore
      ? new Date(
          allPosts[limit - 1].repostedAt || allPosts[limit - 1].createdAt,
        ).toISOString()
      : undefined;
    const postList = hasMore ? allPosts.slice(0, limit) : allPosts;

    const postIds = postList.map((post) => post.id);
    let favoritedPostIds = new Set<string>();
    let repostedPostIds = new Set<string>();

    if (postIds.length > 0) {
      const [favorites, reposts] = await timed(timings, "reactionFlags", () =>
        prisma.$transaction([
          prisma.favorite.findMany({
            where: {
              userId: session.user.id,
              postId: { in: postIds },
            },
            select: { postId: true },
          }),
          prisma.repost.findMany({
            where: {
              userId: session.user.id,
              postId: { in: postIds },
            },
            select: { postId: true },
          }),
        ]),
      );
      favoritedPostIds = new Set(favorites.map((f) => f.postId));
      repostedPostIds = new Set(reposts.map((r) => r.postId));
    }

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
      isFavorited: favoritedPostIds.has(post.id),
      isReposted: repostedPostIds.has(post.id),
      repostedAt: post.repostedAt,
      repostedBy: post.repostedByInfo,
      question: post.question,
    }));

    const response = NextResponse.json({
      posts: formattedPosts,
      hasMore,
      ...(nextCursor && { nextCursor }),
    });
    timings.push({ name: "total", dur: performance.now() - totalStart });
    response.headers.set("Server-Timing", buildServerTimingHeader(timings));
    return response;
  } catch (error) {
    console.error("[Timeline Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
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
        { status: 400 },
      );
    }

    // まず投稿だけを確定して、失敗時に投稿自体が消えないようにする
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

    // 統計更新はベストエフォート。失敗しても投稿作成は成功扱いにする
    try {
      const [
        postCount,
        recentPosts,
        recentReposts,
        totalReposts,
        recentFavoritesReceived,
        favoritesReceived,
        followersCount,
        user,
      ] = await Promise.all([
        prisma.post.count({
          where: { userId: session.user.id },
        }),
        prisma.post.count({
          where: {
            userId: session.user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.repost.count({
          where: {
            userId: session.user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.repost.count({
          where: {
            userId: session.user.id,
          },
        }),
        prisma.favorite.count({
          where: {
            post: {
              userId: session.user.id,
            },
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.favorite.count({
          where: {
            post: {
              userId: session.user.id,
            },
          },
        }),
        prisma.follow.count({
          where: {
            followedId: session.user.id,
          },
        }),
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { createdAt: true, rate: true },
        }),
      ]);

      const accountAgeDays = user?.createdAt
        ? Math.floor(
            (Date.now() - new Date(user.createdAt).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      const calculatedRate = Math.floor(
        recentPosts * 10 +
          Math.sqrt(postCount) * 15 +
          recentReposts * 5 +
          Math.sqrt(totalReposts) * 7 +
          Math.sqrt(recentFavoritesReceived) * 8 +
          Math.sqrt(favoritesReceived) * 5 +
          Math.sqrt(followersCount) * 10 +
          Math.log(accountAgeDays + 1) * 5,
      );

      if (user) {
        const previousRate = user.rate;
        const delta = calculatedRate - previousRate;
        await createRatingHistory(
          session.user.id,
          delta,
          calculatedRate,
          RATING_REASONS.POST_CREATED,
        );
      }

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          postCount,
          rate: calculatedRate,
        },
      });
    } catch (statsError) {
      console.error("[Post Stats Update Error]:", statsError);
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("[Create Post Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
