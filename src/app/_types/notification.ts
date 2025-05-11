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

// 質問関連の型定義（常に匿名）
export interface QuestionNotification {
  id: string;
  question: string;
  answer: string | null;
  targetUserId: string;
  // 回答者の情報のみを含む（質問者情報は不要）
  answerer?: NotificationSender;
}

export interface ChatNotification {
  id: string;
  message: string;
}

export interface ListNotification {
  id: string;
  name: string;
  listId: string;
}

// 共通の通知型定義
export interface Notification {
  id: string;
  // 質問は常に匿名なので、questionをanon_qに統一
  // list_admin_invite: リスト管理者への招待
  // list_admin_request: リスト管理者申請の承認待ち
  type:
    | "fol"
    | "fav"
    | "msg"
    | "rep"
    | "mention"
    | "anon_q"
    | "answer"
    | "list_admin_invite"
    | "list_admin_request";
  createdAt: string;
  isRead: boolean;
  // 匿名質問以外の通知の送信者情報
  sender?: NotificationSender;
  // 関連する投稿情報
  relatedPost?: RelatedPost;
  // 質問関連情報
  question?: QuestionNotification;
  // チャット関連情報
  chat?: ChatNotification;
  // リスト関連情報
  list?: ListNotification;
}

// API レスポンス型
export interface NotificationsResponse {
  notifications: Notification[];
  hasMore: boolean;
  nextCursor?: string;
}
