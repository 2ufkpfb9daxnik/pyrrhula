export interface ChatResponse {
  id: string;
  message: string;
  createdAt: Date;
  isOwnMessage: boolean;
  otherUser: {
    id: string;
    username: string;
    icon: string | null;
  };
}

export interface ChatListResponse {
  chats: ChatResponse[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  createdAt: Date;
  isOwnMessage: boolean;
}

export interface ChatPostRequest {
  message: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
  otherUser: {
    id: string;
    username: string;
    icon: string | null;
  };
}
