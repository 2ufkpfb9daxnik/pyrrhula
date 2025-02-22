export interface RepostListResponse {
  users: {
    id: string;
    username: string;
    icon: string | null;
    createdAt: Date; // リポスト日時
  }[];
  hasMore: boolean;
  nextCursor?: string;
}
