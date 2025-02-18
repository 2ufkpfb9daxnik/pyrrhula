// 検索条件の型定義
export interface SearchQuery {
  q?: string; // 検索キーワード
  from?: string; // 特定のユーザーからの投稿
  since?: string; // この日時以降
  until?: string; // この日時まで
  favorites?: {
    gt?: number; // より多い
    lt?: number; // より少ない
  };
  reposts?: {
    gt?: number; // より多い
    lt?: number; // より少ない
  };
  replyTo?: string; // 特定の投稿への返信
  limit?: number; // 取得件数
  cursor?: string; // ページネーション用カーソル
}

export interface SearchResponse {
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
    parent?: {
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
}
