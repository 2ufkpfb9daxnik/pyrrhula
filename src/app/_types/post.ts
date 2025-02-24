export interface Post {
  id: string;
  content: string;
  createdAt: Date;
  favorites: number;
  reposts: number;
  images: string[];
  user: {
    id: string;
    username: string;
    icon: string | null;
  };
  parent?:
    | {
        id: string;
        content: string;
        user?: {
          id: string;
          username: string;
        };
      }
    | undefined; // null も許容するように変更
  _count: {
    replies: number;
  };
  repostedAt?: string;
  favoritedAt?: string;
  isFavorited?: boolean;
  isReposted?: boolean;
}

// MakePostで使用する親投稿の型
export interface ReplyToPost {
  id: string;
  content: string;
  user?: {
    id: string;
    username: string;
  };
  username?: string;
}

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
  images?: string[];
}

// PostDetailResponseを修正
export interface PostDetailResponse extends Omit<Post, "parent"> {
  parent: {
    id: string;
    content: string;
    createdAt: Date;
    images: string[];
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
    images: string[];
    user: {
      id: string;
      username: string;
      icon: string | null;
    };
  }[];
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

export interface SearchPost {
  id: string;
  content: string;
  createdAt: Date;
  favorites: number;
  reposts: number;
  images: string[];
  user: {
    id: string;
    username: string;
    icon: string | null;
  };
  parent?:
    | {
        id: string;
        content: string;
        user: {
          id: string;
          username: string;
        };
      }
    | undefined;
  _count: {
    replies: number;
  };
}
