export interface NotificationResponse {
  id: string;
  type: "fol" | "fav" | "msg"; // フォロー、お気に入り、メッセージ
  createdAt: Date;
  sender?: {
    id: string;
    username: string;
    icon: string | null;
  };
  relatedPost?: {
    id: string;
    content: string;
  };
}

export interface NotificationsResponse {
  notifications: {
    id: string;
    type: "fol" | "fav" | "msg" | "rep" | "reply";
    createdAt: string;
    sender?: {
      id: string;
      username: string;
      icon: string | null;
    };
    relatedPost?: {
      id: string;
      content: string;
    };
  }[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface NotificationSender {
  id: string;
  username: string;
  icon: string | null;
}

export interface RelatedPost {
  id: string;
  content: string;
}

export interface Notification {
  id: string;
  type: "fol" | "fav" | "msg" | "rep" | "reply"; // 'reply' を追加
  createdAt: string;
  sender?: NotificationSender;
  relatedPost?: RelatedPost;
}

export interface NotificationsResponse {
  notifications: Notification[];
  hasMore: boolean;
  nextCursor?: string;
}
