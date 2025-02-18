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
