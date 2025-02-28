export interface RepostListResponse {
  users: {
    id: string;
    username: string;
    icon: string | null;
    createdAt: Date; // 拡散日時
  }[];
  hasMore: boolean;
  nextCursor?: string;
}
