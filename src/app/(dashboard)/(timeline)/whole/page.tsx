import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { WholeFeed } from "./WholeFeed";
import type { ApiPostRaw, TimelinePageResponse } from "@/lib/api/timeline";
import type { InfiniteData } from "@tanstack/react-query";

const DEFAULT_LIMIT = 10;

type QuestionRow = {
  id: string;
  question: string;
  answer: string | null;
  targetUserId: string;
  User_Question_targetUserIdToUser: {
    username: string;
    icon: string | null;
  };
};

function toQuestion(q: QuestionRow) {
  return {
    id: q.id,
    question: q.question,
    answer: q.answer,
    targetUserId: q.targetUserId,
    targetUser: {
      username: q.User_Question_targetUserIdToUser.username,
      icon: q.User_Question_targetUserIdToUser.icon,
    },
  };
}

async function getInitialTimelineData(
  userId?: string,
): Promise<InfiniteData<TimelinePageResponse, string | undefined>> {
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

  type Merged = {
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
    repostedAt?: Date;
    repostedBy?: { id: string; username: string; icon: string | null };
    question?: ReturnType<typeof toQuestion>;
  };

  let allPosts: Merged[] = regularPosts.map((post) => ({
    ...post,
    images: post.images ?? [],
    parent: post.parent ?? null,
    question:
      post.Question.length > 0 ? toQuestion(post.Question[0]) : undefined,
  }));

  const repostedPosts: Merged[] = reposts.map((repost) => ({
    ...repost.post,
    images: repost.post.images ?? [],
    parent: repost.post.parent ?? null,
    repostedAt: repost.createdAt,
    repostedBy: repost.user,
    question:
      repost.post.Question.length > 0
        ? toQuestion(repost.post.Question[0])
        : undefined,
  }));

  allPosts = [...allPosts, ...repostedPosts];
  allPosts.sort((a, b) => {
    const dateA = a.repostedAt ?? a.createdAt;
    const dateB = b.repostedAt ?? b.createdAt;
    return dateB.getTime() - dateA.getTime();
  });

  const hasMore = allPosts.length > DEFAULT_LIMIT;
  const postList = hasMore ? allPosts.slice(0, DEFAULT_LIMIT) : allPosts;
  const nextCursor = hasMore
    ? (postList[DEFAULT_LIMIT - 1].repostedAt ??
        postList[DEFAULT_LIMIT - 1].createdAt
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

  const posts: ApiPostRaw[] = postList.map((post) => ({
    id: post.id,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    favorites: post.favorites,
    reposts: post.reposts,
    images: post.images,
    user: post.user,
    parent: post.parent,
    _count: { replies: post._count.replies },
    isFavorited: favoritedPostIds.has(post.id),
    isReposted: repostedPostIds.has(post.id),
    repostedAt: post.repostedAt?.toISOString(),
    repostedBy: post.repostedBy,
    question: post.question,
  }));

  return {
    pages: [{ posts, hasMore, nextCursor }],
    pageParams: [undefined],
  };
}

export default async function WholePage() {
  const session = await getServerSession(authOptions);
  const initialData = await getInitialTimelineData(session?.user?.id);

  return <WholeFeed initialData={initialData} />;
}
