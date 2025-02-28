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
  // 既存のプロパティ
  repostedAt?: string | Date;
  favoritedAt?: string | Date;
  isFavorited?: boolean;
  isReposted?: boolean;
  // 拡散関連の新しいプロパティ
  repostedBy?: {
    id: string;
    username: string;
    icon: string | null;
  };
  // 元の投稿 (拡散の場合)
  originalPost?: Post;
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
  // 拡散関連の情報を追加
  repostedBy?: {
    id: string;
    username: string;
    icon: string | null;
  };
  repostedAt?: string | Date;
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
    // 拡散関連の情報を追加
    repostedBy?: {
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

// UserRepostsResponseの拡張
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
    repostedAt: Date | string;
    // 拡散関連の情報を追加
    repostedBy?: {
      id: string;
      username: string;
      icon: string | null;
    };
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
  // 拡散関連の情報を追加
  repostedBy?: {
    id: string;
    username: string;
    icon: string | null;
  };
  repostedAt?: string | Date;
}

// 拡散API用のレスポンス型
export interface RepostListResponse {
  users: {
    id: string;
    username: string;
    icon: string | null;
    createdAt: Date | string;
  }[];
  hasMore: boolean;
  nextCursor?: string;
}
