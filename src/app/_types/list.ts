import type { User } from "./user";

// リストの型定義
export interface List {
  id: string;
  name: string;
  description: string | null;
  creatorId: string;
  isManaged: boolean;
  includeTimelinePosts: boolean;
  createdAt: string;
  // オプショナルな関連フィールド
  creator?: User;
  _count?: {
    members: number;
    followers: number;
    posts: number;
  };
}

// リストメンバーの型定義
export interface ListMember {
  id: string;
  listId: string;
  userId: string;
  isAdmin: boolean;
  status: "pending" | "approved";
  joinedAt: string;
  // オプショナルな関連フィールド
  user?: User;
  list?: List;
}

// リストフォロワーの型定義
export interface ListFollower {
  id: string;
  listId: string;
  userId: string;
  createdAt: string;
  // オプショナルな関連フィールド
  user?: User;
  list?: List;
}

// リストのAPI関連の型定義
export interface CreateListInput {
  name: string;
  description?: string;
  isManaged: boolean;
  includeTimelinePosts: boolean;
  initialMembers?: string[]; // 初期メンバーのユーザーID配列
  initialAdmins?: string[]; // 初期管理者のユーザーID配列（管理リストの場合）
}

export interface UpdateListInput {
  name?: string;
  description?: string;
  includeTimelinePosts?: boolean;
}

// リストメンバー関連のAPI入力型
export interface AddMemberInput {
  userId: string;
  isAdmin?: boolean;
}

// リストのタイムライン取得用パラメータ
export interface ListTimelineParams {
  cursor?: string;
  limit?: number;
  includeReposts?: boolean;
}

// リストのレスポンス型
export interface ListResponse {
  list: List;
  isFollowing: boolean;
  isMember: boolean;
  isAdmin: boolean;
  memberStatus?: "pending" | "approved";
}

// リスト一覧取得のレスポンス型
export interface ListsResponse {
  lists: List[];
  hasMore: boolean;
  nextCursor?: string;
}

// リストメンバー一覧のレスポンス型
export interface ListMembersResponse {
  members: ListMember[];
  hasMore: boolean;
  nextCursor?: string;
}

// リストフォロワー一覧のレスポンス型
export interface ListFollowersResponse {
  followers: ListFollower[];
  hasMore: boolean;
  nextCursor?: string;
}
