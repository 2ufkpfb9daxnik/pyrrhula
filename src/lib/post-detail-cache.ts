import type { QueryClient, InfiniteData } from "@tanstack/react-query";
import type { Post, PostDetailResponse } from "@/app/_types/post";
import type { ApiPostRaw, TimelinePageResponse } from "@/lib/api/timeline";
import { formatApiPost } from "@/lib/format-post";

function toDetailSeed(post: Post): PostDetailResponse {
  return {
    ...post,
    images: post.images ?? [],
    parent: post.parent?.user
      ? {
          id: post.parent.id,
          content: post.parent.content,
          createdAt:
            post.createdAt instanceof Date
              ? post.createdAt
              : new Date(post.createdAt),
          images: [],
          user: {
            id: post.parent.user.id,
            username: post.parent.user.username,
            icon: null,
          },
        }
      : null,
    replies: [],
  };
}

function normalizeCachedPost(raw: ApiPostRaw | Post): Post {
  if (raw.createdAt instanceof Date) {
    return raw as Post;
  }
  return formatApiPost(raw as ApiPostRaw);
}

/** タイムライン等のキャッシュから投稿を探し、詳細画面の即表示用に返す */
export function findCachedPostForDetail(
  queryClient: QueryClient,
  postId: string,
): PostDetailResponse | undefined {
  const infiniteQueries = queryClient.getQueriesData<
    InfiniteData<TimelinePageResponse | { posts: (ApiPostRaw | Post)[] }>
  >({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) &&
        (key[0] === "timeline" ||
          (key[0] === "user" && key[2] === "content") ||
          key[0] === "search")
      );
    },
  });

  for (const [, data] of infiniteQueries) {
    if (!data || !("pages" in data) || !Array.isArray(data.pages)) continue;
    for (const page of data.pages) {
      const posts = page?.posts;
      if (!Array.isArray(posts)) continue;
      const hit = posts.find((p) => p.id === postId);
      if (hit) {
        return toDetailSeed(normalizeCachedPost(hit));
      }
    }
  }

  const flatQueries = queryClient.getQueriesData<{
    posts?: (ApiPostRaw | Post)[];
  }>({
    predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "search",
  });

  for (const [, data] of flatQueries) {
    const posts = data?.posts;
    if (!Array.isArray(posts)) continue;
    const hit = posts.find((p) => p.id === postId);
    if (hit) {
      return toDetailSeed(normalizeCachedPost(hit));
    }
  }

  return undefined;
}
