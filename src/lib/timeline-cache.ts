import type { QueryClient, InfiniteData } from "@tanstack/react-query";
import type { Post } from "@/app/_types/post";
import type { ApiPostRaw, TimelinePageResponse } from "@/lib/api/timeline";
import { queryKeys } from "@/lib/api/query-keys";

function postToApiRaw(post: Post): ApiPostRaw {
  const createdAt =
    post.createdAt instanceof Date
      ? post.createdAt.toISOString()
      : String(post.createdAt);

  return {
    id: post.id,
    content: post.content,
    createdAt,
    favorites: post.favorites,
    reposts: post.reposts,
    images: post.images ?? [],
    user: post.user,
    parent: post.parent ?? null,
    _count: post._count,
    isFavorited: post.isFavorited,
    isReposted: post.isReposted,
  };
}

function upsertInTimelineData(
  old: InfiniteData<TimelinePageResponse, string | undefined> | undefined,
  post: Post,
): InfiniteData<TimelinePageResponse, string | undefined> {
  const apiPost = postToApiRaw(post);

  if (!old || old.pages.length === 0) {
    return {
      pages: [{ posts: [apiPost], hasMore: false }],
      pageParams: [undefined],
    };
  }

  const [first, ...rest] = old.pages;
  let posts = [...first.posts];

  if (post.id.startsWith("temp-")) {
    posts = [apiPost, ...posts.filter((p) => !p.id.startsWith("temp-"))];
  } else {
    const tempIndex = posts.findIndex((p) => p.id.startsWith("temp-"));
    const existingIndex = posts.findIndex((p) => p.id === post.id);

    if (tempIndex >= 0) {
      posts = [
        ...posts.slice(0, tempIndex),
        apiPost,
        ...posts.slice(tempIndex + 1),
      ];
    } else if (existingIndex >= 0) {
      posts = posts.map((p, i) => (i === existingIndex ? apiPost : p));
    } else {
      posts = [apiPost, ...posts];
    }
  }

  return {
    ...old,
    pages: [{ ...first, posts }, ...rest],
    pageParams: old.pageParams,
  };
}

/** 全体・フォロー中タイムラインのキャッシュに投稿を即時反映する */
export function upsertPostInTimelines(
  queryClient: QueryClient,
  post: Post,
): void {
  const keys = [queryKeys.wholeTimeline(), queryKeys.homeTimeline()];

  for (const key of keys) {
    queryClient.setQueryData(
      key,
      (
        old:
          | InfiniteData<TimelinePageResponse, string | undefined>
          | undefined,
      ) => upsertInTimelineData(old, post),
    );
  }
}
