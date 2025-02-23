import useSWR from "swr";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: {
    username: string;
    icon: string | null;
  };
}

// フェッチャー関数
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("メッセージの取得に失敗しました");
  return res.json();
};

export function useGroupChat(groupId: string) {
  // メッセージ一覧の取得と自動更新
  const {
    data: messages,
    error,
    mutate,
  } = useSWR<Message[]>(`/api/chat/group/${groupId}/messages`, fetcher, {
    refreshInterval: 3000, // 3秒ごとに更新
  });

  // メッセージ送信関数
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // 楽観的更新用の仮のメッセージ
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      senderId: "current-user-id", // 後で実際のユーザーIDに置き換える
      sender: {
        username: "You",
        icon: null,
      },
    };

    try {
      // 楽観的更新
      await mutate([...(messages || []), tempMessage], false);

      // 実際のAPI呼び出し
      const response = await fetch(`/api/chat/group/${groupId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("メッセージの送信に失敗しました");
      }

      // 成功したら最新のデータで再取得
      await mutate();
    } catch (error) {
      // エラー時は楽観的更新を元に戻す
      await mutate(messages, false);
      throw error;
    }
  };

  return {
    messages,
    error,
    sendMessage,
    isLoading: !error && !messages,
  };
}
