import type { RatingColor } from "./rating";

export interface UserListResponse {
  users: {
    id: string;
    username: string;
    icon: string | null;
    rate: number;
    postCount: number;
    createdAt: Date;
    ratingColor?: RatingColor; // オプショナルとして追加
    recentPostCount?: number; // オプショナルとして追加
  }[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number; // 追加: 総ユーザー数
}

export interface UserDetailResponse {
  id: string;
  username: string;
  icon: string | null;
  profile: string | null;
  postCount: number;
  rate: number;
  createdAt: Date;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  ratingColor?: RatingColor; // オプショナルとして追加
  recentPostCount?: number; // オプショナルとして追加
}
