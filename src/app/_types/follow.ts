export interface FollowRequest {
  userId: string; // フォローしたいユーザーのID
}

export interface FollowResponse {
  id: string;
  followerId: string;
  followedId: string;
  createdAt: Date;
}

export interface UserFollowersResponse {
  followers: {
    id: string;
    username: string;
    icon: string | null;
    profile: string | null;
    followedAt: Date;
    isFollowing?: boolean; // 閲覧者がこのユーザーをフォローしているか
  }[];
  hasMore: boolean;
  nextCursor?: string;
}
