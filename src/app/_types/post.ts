export interface Post {
  id: string;
  content: string;
  createdAt: Date;
  favorites: number;
  reposts: number;
  isRepost?: boolean;
  repostedBy?: {
    id: string;
    username: string;
  };
  user: {
    id: string;
    username: string;
    icon: string | null;
  };
  _count: {
    replies: number;
  };
}

export type PostProps = {
  post: Post;
  onRepostSuccess?: () => Promise<void>;
  onFavoriteSuccess?: () => Promise<void>;
};

interface PostResponse {
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
  parent?: {
    id: string;
    content: string;
    user: {
      id: string;
      username: string;
    };
  } | null;
  _count: {
    replies: number;
  };
  isFavorited?: boolean;
  isReposted?: boolean;
}

export type TimelineResponse = {
  posts: Post[];
  hasMore: boolean;
  nextCursor?: string;
  isInitialLoad?: boolean;
};

export interface CreatePostRequest {
  content: string;
  parentId?: string;
}

export interface PostDetailResponse {
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
  parent: {
    id: string;
    content: string;
    user: {
      id: string;
      username: string;
      icon: string | null;
    };
  } | null;
  replies: {
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
  }[];
  isFavorited?: boolean;
  isReposted?: boolean;
}

export type UserRepliesResponse = {
  replies: {
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
    parent: {
      id: string;
      content: string;
      user: {
        id: string;
        username: string;
      };
    } | null;
  }[];
  hasMore: boolean;
  nextCursor?: string;
};

export interface UserRepostsResponse {
  reposts: {
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
    repostedAt: Date;
  }[];
  hasMore: boolean;
  nextCursor?: string;
}
