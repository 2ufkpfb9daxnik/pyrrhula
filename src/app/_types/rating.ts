export type RatingColor =
  | "text-gray-300" // 白(黒)
  | "text-gray-500" // 灰
  | "text-amber-700" // 茶
  | "text-lime-500" // 黄緑
  | "text-green-500" // 緑
  | "text-cyan-500" // 水
  | "text-blue-500" // 青
  | "text-purple-500" // 紫
  | "text-yellow-500" // 黄
  | "text-orange-500" // 橙
  | "text-red-500" // 赤
  | "bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500"; // 虹

export interface UserRating {
  color: RatingColor;
  recentPostCount: number;
  totalPostCount: number;
  score: number;
  // 拡張情報（オプショナル）
  stats?: {
    posts: {
      total: number;
      recent: number;
    };
    reposts: {
      given: {
        total: number;
        recent: number;
      };
      received: {
        total: number;
        recent: number;
      };
    };
    favorites: {
      given: {
        total: number;
        recent: number;
      };
      received: {
        total: number;
        recent: number;
      };
    };
    followers: number;
    following: number;
    accountAgeDays: number;
  };
}
