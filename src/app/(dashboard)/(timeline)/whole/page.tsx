import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { WholeFeed } from "./WholeFeed";

const DEFAULT_LIMIT = 10;

async function getInitialPosts(userId?: string) {
  const take = DEFAULT_LIMIT + 1;

  const [regularPosts, reposts] = await Promise.all([
    prisma.post.findMany({
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        favorites: true,
        reposts: true,
        images: true,
        user: { select: { id: true, username: true, icon: true } },
        parent: {
          select: {
            id: true,
            content: true,
            user: { select: { id: true, username: true } },
          },
        },
        _count: { select: { replies: true } },
        Question: {
          take: 1,
          select: {
            id: true,
            question: true,
            answer: true,
            targetUserId: true,
            User_Question_targetUserIdToUser: {
              select: { username: true, icon: true },
            },
          },
        },
      },
    }),
    prisma.repost.findMany({
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        user: { select: { id: true, username: true, icon: true } },
        post: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            favorites: true,
            reposts: true,
            images: true,
            user: { select: { id: true, username: true, icon: true } },
            parent: {
              select: {
                id: true,
                content: true,
                user: { select: { id: true, username: true } },
              },
            },
            _count: { select: { replies: true } },
            Question: {
              take: 1,
              select: {
                id: true,
                question: true,
                answer: true,
                targetUserId: true,
                User_Question_targetUserIdToUser: {
                  select: { username: true, icon: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  type FormattedPost = {
    id: string;
    content: string;
    createdAt: Date;
    favorites: number;
    reposts: number;
    images: string[];
    user: { id: string; username: string; icon: string | null };
    parent: {
      id: string;
      content: string;
      user?: { id: string; username: string };
    } | null;
    _count: { replies: number };
    isReposted: boolean;
    isFavorited: boolean;
    repostedAt?: Date;
    repostedByInfo?: { id: string; username: string; icon: string | null };
    question?: {
      id: string;
      question: string;
      answer: string | null;
      targetUserId: string;
      targetUser: { username: string; icon: string | null };
    };
  };

  const toQuestion = (q: any) =>
    q
      ? {
          id: q.id,
          question: q.question,
          answer: q.answer,
          targetUserId: q.targetUserId,
          targetUser: {
            username: q.User_Question_targetUserIdToUser.username,
            icon: q.User_Question_targetUserIdToUser.icon,
          },
        }
      : undefined;

  let allPosts: FormattedPost[] = regularPosts.map((post) => ({
    ...post,
    isReposted: false,
    isFavorited: false,
    repostedAt: undefined,
    parent: post.parent || null,
    question:
      post.Question && post.Question.length > 0
        ? toQuestion(post.Question[0])
        : undefined,
  }));

  const repostedPosts: FormattedPost[] = reposts.map((repost) => ({
    ...repost.post,
    images: repost.post.images || [],
    parent: repost.post.parent || null,
    repostedAt: repost.createdAt,
    isReposted: false,
    isFavorited: false,
    repostedByInfo: {
      id: repost.user.id,
      username: repost.user.username,
      icon: repost.user.icon,
    },
    question:
      repost.post.Question && repost.post.Question.length > 0
        ? toQuestion(repost.post.Question[0])
        : undefined,
  }));

  allPosts = [...allPosts, ...repostedPosts];
  allPosts.sort((a, b) => {
    const dateA = a.repostedAt || a.createdAt;
    const dateB = b.repostedAt || b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const hasMore = allPosts.length > DEFAULT_LIMIT;
  const postList = hasMore ? allPosts.slice(0, DEFAULT_LIMIT) : allPosts;
  const nextCursor = hasMore
    ? new Date(
        postList[DEFAULT_LIMIT - 1].repostedAt ||
          postList[DEFAULT_LIMIT - 1].createdAt,
      ).toISOString()
    : undefined;

  const postIds = postList.map((p) => p.id);
  let favoritedPostIds = new Set<string>();
  let repostedPostIds = new Set<string>();

  if (userId && postIds.length > 0) {
    const [favorites, userReposts] = await prisma.$transaction([
      prisma.favorite.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
      prisma.repost.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]);
    favoritedPostIds = new Set(favorites.map((f) => f.postId));
    repostedPostIds = new Set(userReposts.map((r) => r.postId));
  }

  const formattedPosts = postList.map((post) => ({
    id: post.id,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    favorites: post.favorites,
    reposts: post.reposts,
    images: post.images || [],
    user: post.user,
    parent: post.parent || null,
    _count: { replies: post._count.replies },
    isFavorited: favoritedPostIds.has(post.id),
    isReposted: repostedPostIds.has(post.id),
    repostedAt: post.repostedAt?.toISOString(),
    repostedBy: post.repostedByInfo,
    question: post.question,
  }));

  return { posts: formattedPosts, hasMore, nextCursor };
}

export default async function WholePage() {
  const session = await getServerSession(authOptions);
  const { posts, hasMore, nextCursor } = await getInitialPosts(
    session?.user?.id,
  );

  return (
    <WholeFeed
      initialPostsRaw={posts}
      initialHasMore={hasMore}
      initialNextCursor={nextCursor}
    />
  );
}
