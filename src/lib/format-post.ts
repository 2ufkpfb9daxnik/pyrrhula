import type { ApiPostRaw, FormattedTimelinePost } from "@/lib/api/timeline";

export function formatApiPost(post: ApiPostRaw): FormattedTimelinePost {
  let repostedBy: FormattedTimelinePost["repostedBy"];

  if (post.repostedBy) {
    repostedBy = post.repostedBy;
  } else if (post.repostedByUserId && post.repostedByUser) {
    repostedBy = {
      id: post.repostedByUser.id || post.repostedByUserId,
      username: post.repostedByUser.username || "",
      icon: post.repostedByUser.icon || null,
    };
  } else if (post.repostedByUserId) {
    repostedBy = {
      id: post.repostedByUserId,
      username: "ユーザー",
      icon: null,
    };
  }

  return {
    id: post.id,
    content: post.content,
    createdAt: new Date(post.createdAt),
    favorites: post.favorites,
    reposts: post.reposts,
    images: post.images ?? [],
    user: post.user,
    parent: post.parent ?? undefined,
    _count: post._count,
    isFavorited: post.isFavorited,
    isReposted: post.isReposted,
    repostedAt: post.repostedAt ? new Date(post.repostedAt) : undefined,
    favoritedAt: post.favoritedAt ? new Date(post.favoritedAt) : undefined,
    repostedBy,
    originalPost: post.originalPost
      ? formatApiPost(post.originalPost)
      : undefined,
    question: post.question,
  };
}

export function filterTimelinePosts(
  posts: FormattedTimelinePost[],
): FormattedTimelinePost[] {
  return posts.filter((post) => {
    if (post.repostedBy) return true;
    const isRepostedByOthers = posts.some(
      (p) => p.repostedBy && p.id === post.id,
    );
    return !isRepostedByOthers;
  });
}
