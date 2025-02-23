import prisma from "@/lib/prisma";

export async function updateUserStats(userId: string) {
  try {
    const [followersCount, followingCount, postCount, recentPosts] =
      await Promise.all([
        prisma.follow.count({
          where: { followedId: userId },
        }),
        prisma.follow.count({
          where: { followerId: userId },
        }),
        prisma.post.count({
          where: { userId },
        }),
        prisma.post.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    const rate = recentPosts * 10 + postCount;

    await prisma.user.update({
      where: { id: userId },
      data: {
        followersCount,
        followingCount,
        postCount,
        rate,
      },
    });

    return { followersCount, followingCount, postCount, rate };
  } catch (error) {
    console.error("Error updating user stats:", error);
    throw error;
  }
}
