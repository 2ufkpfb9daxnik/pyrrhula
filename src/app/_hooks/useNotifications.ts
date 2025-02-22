import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export function useNotifications() {
  const [hasUnread, setHasUnread] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    // 初回の未読通知チェック
    checkUnreadNotifications();

    // WebSocketコネクションの設定
    const ws = new WebSocket(
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000"
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "notification" && data.userId === session.user.id) {
        setHasUnread(true);
      }
    };

    // 定期的なポーリング（WebSocketのフォールバック）
    const interval = setInterval(checkUnreadNotifications, 30000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, [session]);

  const checkUnreadNotifications = async () => {
    try {
      const response = await fetch("/api/notifications/unread");
      if (response.ok) {
        const { hasUnread } = await response.json();
        setHasUnread(hasUnread);
      }
    } catch (error) {
      console.error("Failed to check notifications:", error);
    }
  };

  const markAsRead = () => {
    setHasUnread(false);
  };

  return { hasUnread, markAsRead };
}
