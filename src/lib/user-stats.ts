import prisma from "@/lib/prisma";

/**
 * 特定のユーザーの統計情報を更新する
 * @param userId 更新するユーザーのID
 * @returns 更新された統計情報と成功/失敗情報
 */
export async function updateUserStats(userId: string) {
  try {
    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        userId,
        success: false,
        error: `ユーザーID ${userId} は存在しません`,
      };
    }

    // 各種統計情報を並列で取得
    const [followersCount, followingCount, postCount, recentPosts] =
      await Promise.all([
        // followedIdがこのユーザーIDであるフォローレコードをカウント
        prisma.follow.count({
          where: { followedId: userId },
        }),
        // followerIdがこのユーザーIDであるフォローレコードをカウント
        prisma.follow.count({
          where: { followerId: userId },
        }),
        // このユーザーIDによる投稿をカウント
        prisma.post.count({
          where: { userId },
        }),
        // 過去30日間のこのユーザーによる投稿をカウント
        prisma.post.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30日前から現在まで
            },
          },
        }),
      ]);

    // アクティビティスコア計算: 最近の投稿に高いウェイトを設定
    const rate = recentPosts * 10 + postCount;

    // ユーザー情報を更新
    await prisma.user.update({
      where: { id: userId },
      data: {
        followersCount,
        followingCount,
        postCount,
        rate,
      },
    });

    // 成功情報と統計データを返却
    return {
      userId,
      success: true,
      followersCount,
      followingCount,
      postCount,
      recentPosts,
      rate,
    };
  } catch (error) {
    console.error(`Error updating stats for user ${userId}:`, error);
    // エラーをスローせず、エラー情報を含むオブジェクトを返す
    return {
      userId,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * サイト全体の統計情報を取得する
 * @returns サイト全体の統計情報
 */
export async function getSiteStats() {
  try {
    // 総ユーザー数
    const totalUsers = await prisma.user.count();

    // 総投稿数
    const totalPosts = await prisma.post.count();

    // 総フォロー数
    const totalFollows = await prisma.follow.count();

    // 過去30日間の投稿があるアクティブユーザー数
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const activeUsers = await prisma.user.count({
      where: {
        posts: {
          some: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        },
      },
    });

    return {
      success: true,
      totalUsers,
      totalPosts,
      totalFollows,
      activeUsers,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error getting site stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
