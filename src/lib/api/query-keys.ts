export const queryKeys = {
  wholeTimeline: () => ["timeline", "whole"] as const,
  homeTimeline: () => ["timeline", "home"] as const,
  listTimeline: (listId: string) => ["timeline", "list", listId] as const,
  user: (userId: string) => ["user", userId] as const,
  userContent: (
    userId: string,
    type: "posts" | "reposts" | "favorites" | "replies",
  ) => ["user", userId, "content", type] as const,
  userRatingHistory: (userId: string) =>
    ["user", userId, "rating-history"] as const,
  usersList: (sort: string, page: number) =>
    ["users", "list", sort, page] as const,
  notifications: () => ["notifications"] as const,
  currentUser: (userId: string) => ["current-user", userId] as const,
  userLists: () => ["lists", "member"] as const,
  followedLists: () => ["lists", "followed"] as const,
  search: (query: string, type: "posts" | "users") =>
    ["search", type, query] as const,
};
