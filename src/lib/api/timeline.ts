import type { Post, QuestionInfo } from "@/app/_types/post";

/** API が返す投稿の生データ（日付は文字列） */
export interface ApiPostRaw {
  id: string;
  content: string;
  createdAt: string;
  favorites: number;
  reposts: number;
  images?: string[];
  user: {
    id: string;
    username: string;
    icon: string | null;
  };
  parent?: {
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
  isFavorited?: boolean;
  isReposted?: boolean;
  repostedAt?: string;
  repostedBy?: {
    id: string;
    username: string;
    icon: string | null;
  };
  repostedByUserId?: string;
  repostedByUser?: {
    id: string;
    username: string;
    icon: string | null;
  };
  originalPost?: ApiPostRaw;
  favoritedAt?: string;
  question?: QuestionInfo;
}

export interface TimelinePageResponse {
  posts: ApiPostRaw[];
  hasMore: boolean;
  nextCursor?: string;
}

export type FormattedTimelinePost = Post & {
  repostedBy?: {
    id: string;
    username: string;
    icon: string | null;
  };
};
