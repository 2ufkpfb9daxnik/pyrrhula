export interface UserListResponse {
  users: {
    id: string;
    username: string;
    icon: string | null;
    rate: number;
    postCount: number;
    createdAt: Date;
  }[];
  hasMore: boolean;
  nextCursor?: string;
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
  isFollowing?: boolean; // 閲覧者がこのユーザーをフォローしているか
}

