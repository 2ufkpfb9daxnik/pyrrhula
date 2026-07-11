import { describe, it, expect } from "vitest";
import { formatApiPost, filterTimelinePosts } from "@/lib/format-post";
import type { ApiPostRaw } from "@/lib/api/timeline";

const basePost: ApiPostRaw = {
  id: "post-1",
  content: "hello",
  createdAt: "2026-01-01T00:00:00.000Z",
  favorites: 1,
  reposts: 0,
  images: [],
  user: { id: "u1", username: "alice", icon: null },
  _count: { replies: 0 },
};

describe("formatApiPost", () => {
  it("parses dates and builds repostedBy fallback", () => {
    const formatted = formatApiPost({
      ...basePost,
      repostedByUserId: "u2",
      repostedByUser: { id: "u2", username: "bob", icon: null },
    });

    expect(formatted.createdAt).toBeInstanceOf(Date);
    expect(formatted.repostedBy?.username).toBe("bob");
  });
});

describe("filterTimelinePosts", () => {
  it("hides original posts when repost wrapper exists", () => {
    const original = formatApiPost(basePost);
    const repost = formatApiPost({
      ...basePost,
      repostedBy: { id: "u2", username: "bob", icon: null },
    });

    const filtered = filterTimelinePosts([original, repost]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].repostedBy?.id).toBe("u2");
  });
});
