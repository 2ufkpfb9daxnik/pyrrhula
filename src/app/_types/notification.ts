// 基本的な型定義
export interface NotificationSender {
  id: string;
  username: string;
  icon: string | null;
}

export interface RelatedPost {
  id: string;
  content: string;
}

// 共通の通知型定義
export interface Notification {
  id: string;
  type: "fol" | "fav" | "msg" | "rep" | "reply" | "mention";
  createdAt: string;
  isRead: boolean;
  sender?: NotificationSender;
  relatedPost?: RelatedPost;
}

// API レスポンス型
export interface NotificationsResponse {
  notifications: Notification[];
  hasMore: boolean;
  nextCursor?: string;
}

// 下位互換性
export type NotificationResponse = Notification;
