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

export interface QuestionNotification {
  id: string;
  question: string;
  answer: string | null;
  sender?: NotificationSender;
  answerer?: NotificationSender;
}

export interface ChatNotification {
  id: string;
  message: string;
}

// 共通の通知型定義
export interface Notification {
  id: string;
  type: "fol" | "fav" | "msg" | "rep" | "anon_q" | "answer" | "mention";
  createdAt: string;
  isRead: boolean;
  sender?: NotificationSender;
  relatedPost?: RelatedPost;
  question?: QuestionNotification;
  chat?: ChatNotification;
}

// API レスポンス型
export interface NotificationsResponse {
  notifications: Notification[];
  hasMore: boolean;
  nextCursor?: string;
}
