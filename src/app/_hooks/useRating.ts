import { useState, useEffect } from "react";
import type { UserRating } from "@/app/_types/rating";

export function useRating(userId: string) {
  const [rating, setRating] = useState<UserRating | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRating = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/rating`);
        if (!response.ok) throw new Error("Failed to fetch rating");
        const data = await response.json();
        setRating(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch rating");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRating();
  }, [userId]);

  return { rating, isLoading, error };
}
