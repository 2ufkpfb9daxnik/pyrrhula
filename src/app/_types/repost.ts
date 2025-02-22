export interface RepostUser {
  id: string;
  username: string;
  icon: string | null;
  createdAt: Date;
}

export interface RepostListResponse {
  users: RepostUser[];
  hasMore: boolean;
  nextCursor?: string;
}
