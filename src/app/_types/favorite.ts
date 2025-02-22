export interface FavoriteListResponse {
  users: {
    id: string;
    username: string;
    icon: string | null;
    createdAt: Date; // お気に入りした日時
  }[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface UserFavoritePostsResponse {
  posts: {
    id: string;
    content: string;
    createdAt: Date;
    favorites: number;
    reposts: number;
    user: {
      id: string;
      username: string;
      icon: string | null;
    };
    favoritedAt: Date;
  }[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface FavoriteUser {
  id: string;
  username: string;
  icon: string | null;
  createdAt: Date;
}

export interface FavoriteListResponse {
  users: FavoriteUser[];
  hasMore: boolean;
  nextCursor?: string;
}
