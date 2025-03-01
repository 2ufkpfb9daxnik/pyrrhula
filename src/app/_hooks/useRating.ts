import { useState, useEffect, useRef } from "react";
import type { UserRating } from "@/app/_types/rating";
import { useRatingStore } from "@/store/ratingStore";

// リクエスト中のユーザーIDを追跡するグローバルマップ
// Promise に resolve/reject 関数を追加した拡張型を定義
interface ExtendedPromise<T> extends Promise<T> {
  resolve?: (value: T) => void;
  reject?: (reason: any) => void;
}

const pendingRequests = new Map<string, ExtendedPromise<UserRating>>();
// バッチ処理用のキュー
const batchQueue: string[] = [];
// バッチ処理のタイマーID
let batchTimer: NodeJS.Timeout | null = null;
// バッチサイズ
const BATCH_SIZE = 10;
// バッチ処理の遅延時間（ミリ秒）
const BATCH_DELAY = 100;

/**
 * ユーザーIDを指定してレーティング情報を取得するフック
 * - キャッシュを活用して同一ユーザーの重複リクエストを防止
 * - バッチ処理で複数のユーザー情報を一度のリクエストにまとめる
 */
export function useRating(userId: string) {
  const { ratings, setRating, batchSetRatings } = useRatingStore();
  const [isLoading, setIsLoading] = useState(!ratings[userId]);
  const [error, setError] = useState<string | null>(null);
  // このフックがマウントされているかを追跡
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      // クリーンアップ時にマウント状態をfalseに設定
      isMounted.current = false;
    };
  }, []);

  // バッチ処理を実行する関数
  const processBatch = async () => {
    // キューからBATCH_SIZE分のユーザーIDを取り出す
    const userIds = [...new Set(batchQueue.splice(0, BATCH_SIZE))];
    if (userIds.length === 0) return;

    console.log(
      `[Rating] バッチ処理: ${userIds.length}件のレーティングをまとめて取得します`
    );

    try {
      // 正しいAPIパスに修正: /api/users/rating/batch -> /api/users/[id]/rating/batch
      const response = await fetch("/api/users/id/rating/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });

      if (!response.ok) throw new Error("Failed to fetch batch ratings");

      const data: Record<string, UserRating> = await response.json();

      // バッチ結果をストアに保存
      batchSetRatings(data);

      // ペンディングリクエストを解決
      userIds.forEach((id) => {
        const pendingPromise = pendingRequests.get(id);
        if (pendingPromise && pendingPromise.resolve) {
          pendingPromise.resolve(data[id]);
        }
        pendingRequests.delete(id);
      });
    } catch (err) {
      console.error("バッチレーティング取得エラー:", err);
      // ペンディングリクエストを拒否
      userIds.forEach((id) => {
        const pendingPromise = pendingRequests.get(id);
        if (pendingPromise && pendingPromise.reject) {
          pendingPromise.reject(err);
        }
        pendingRequests.delete(id);
      });

      // エラー発生時は個別のAPIで再試行するフォールバック
      console.log("[Rating] フォールバック: 個別APIで再試行します");
      userIds.forEach(async (id) => {
        try {
          if (!ratings[id]) {
            // まだキャッシュにない場合のみ
            const rating = await fetchSingleRating(id);
            setRating(id, rating);
          }
        } catch (error) {
          console.error(`[Rating] ユーザー ${id} の個別取得に失敗:`, error);
        }
      });
    }

    // キューに残りがあれば再度バッチ処理をスケジュール
    if (batchQueue.length > 0) {
      batchTimer = setTimeout(processBatch, BATCH_DELAY);
    } else {
      batchTimer = null;
    }
  };

  // 単一ユーザーのレーティングを取得する関数
  const fetchSingleRating = async (id: string): Promise<UserRating> => {
    try {
      const response = await fetch(`/api/users/${id}/rating`);
      if (!response.ok) throw new Error("Failed to fetch rating");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`[Rating] ユーザー ${id} のレーティング取得エラー:`, error);
      throw error;
    }
  };

  // ユーザーのレーティングを取得する処理
  useEffect(() => {
    // ユーザーIDがない場合は何もしない
    if (!userId) return;

    // すでにキャッシュにある場合は何もしない
    if (ratings[userId]) {
      setIsLoading(false);
      return;
    }

    const fetchRating = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let rating: UserRating;

        // すでに同じユーザーのリクエストが進行中の場合、そのPromiseを再利用
        if (pendingRequests.has(userId)) {
          rating = await pendingRequests.get(userId)!;
        }
        // バッチ処理に対応
        else if (typeof batchSetRatings === "function") {
          // 新しいPromiseを作成し、resolve/rejectを外部から制御できるようにする
          let resolvePromise: (value: UserRating) => void;
          let rejectPromise: (reason: any) => void;

          const promise = new Promise<UserRating>((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
          }) as ExtendedPromise<UserRating>; // 拡張型にキャスト

          // カスタムプロパティを追加
          promise.resolve = resolvePromise!;
          promise.reject = rejectPromise!;

          pendingRequests.set(userId, promise);

          // バッチキューに追加
          batchQueue.push(userId);

          // バッチタイマーがなければ設定
          if (!batchTimer) {
            batchTimer = setTimeout(processBatch, BATCH_DELAY);
          }

          try {
            // Promiseを待機
            rating = await promise;
          } catch (error) {
            // バッチ処理に失敗した場合、個別APIで再試行
            console.log(`[Rating] バッチ失敗: ${userId} を個別に取得します`);
            rating = await fetchSingleRating(userId);
            setRating(userId, rating);
          }
        }
        // バッチ処理が使用できない場合は通常のリクエスト
        else {
          const promise = fetchSingleRating(userId);
          pendingRequests.set(userId, promise);

          rating = await promise;
          setRating(userId, rating);

          pendingRequests.delete(userId);
        }

        // コンポーネントがまだマウントされている場合のみ状態を更新
        if (isMounted.current) {
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch rating"
          );
          setIsLoading(false);
        }
      }
    };

    fetchRating();
  }, [userId, ratings, setRating, batchSetRatings]);

  return {
    rating: ratings[userId] || null,
    isLoading,
    error,
  };
}
