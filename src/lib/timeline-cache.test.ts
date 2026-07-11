import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { upsertPostInTimelines } from "@/lib/timeline-cache";
import { queryKeys } from "@/lib/api/query-keys";
import type { Post } from "@/app/_types/post";

const samplePost = (id: string): Post => ({
  id,
  content: "test",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  favorites: 0,
  reposts: 0,
  images: [],
  user: { id: "u1", username: "alice", icon: null },
  _count: { replies: 0 },
});

describe("upsertPostInTimelines", () => {
  it("prepends optimistic post to empty cache", () => {
    const client = new QueryClient();
    upsertPostInTimelines(client, samplePost("temp-1"));

    const data = client.getQueryData(queryKeys.wholeTimeline()) as {
      pages: { posts: { id: string }[] }[];
    };

    expect(data.pages[0].posts[0].id).toBe("temp-1");
  });

  it("replaces temp post with confirmed post", () => {
    const client = new QueryClient();
    upsertPostInTimelines(client, samplePost("temp-1"));
    upsertPostInTimelines(client, samplePost("real-1"));

    const data = client.getQueryData(queryKeys.wholeTimeline()) as {
      pages: { posts: { id: string }[] }[];
    };

    expect(data.pages[0].posts.map((p) => p.id)).toEqual(["real-1"]);
  });
});
