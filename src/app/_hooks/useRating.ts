import { useState, useEffect } from "react";
import type { UserRating } from "@/app/_types/rating";
import { useRatingStore } from "@/store/ratingStore";

export function useRating(userId: string) {
  const { ratings, setRating } = useRatingStore();
  const [isLoading, setIsLoading] = useState(!ratings[userId]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRating = async () => {
      // キャッシュにデータがある場合はスキップ
      if (ratings[userId]) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/users/${userId}/rating`);
        if (!response.ok) throw new Error("Failed to fetch rating");
        const data = await response.json();
        setRating(userId, data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch rating");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRating();
  }, [userId, ratings, setRating]);

  return {
    rating: ratings[userId] || null,
    isLoading,
    error,
  };
}
