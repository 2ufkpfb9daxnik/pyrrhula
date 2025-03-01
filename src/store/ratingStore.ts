import { create } from "zustand";
import type { UserRating } from "@/app/_types/rating";

interface RatingStore {
  ratings: Record<string, UserRating>;
  setRating: (userId: string, rating: UserRating) => void;
  batchSetRatings: (ratingsData: Record<string, UserRating>) => void;
}

export const useRatingStore = create<RatingStore>((set) => ({
  ratings: {},
  setRating: (userId, rating) =>
    set((state) => ({
      ratings: {
        ...state.ratings,
        [userId]: rating,
      },
    })),
  batchSetRatings: (ratingsData) =>
    set((state) => ({
      ratings: {
        ...state.ratings,
        ...ratingsData,
      },
    })),
}));
