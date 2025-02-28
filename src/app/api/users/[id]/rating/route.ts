import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateRating } from "@/lib/rating";
import { authOptions } from "@/lib/auth";
import type { UserRating } from "@/app/_types/rating";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = params.id;

    // 直近の投稿数を取得（過去30日）
    const recentPosts = await prisma.post.count({
      where: {
        userId: userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
        },
      },
    });

    // 全体の投稿数を取得
    const totalPosts = await prisma.post.count({
      where: {
        userId: userId,
      },
    });

    // 拡散関連の統計を取得
    const [
      recentReposts, // 最近の拡散数（過去30日）
      totalReposts, // 総拡散数
      receivedRepostsCount, // 自分の投稿が拡散された回数
      recentReceivedReposts, // 最近自分の投稿が拡散された回数（過去30日）
    ] = await Promise.all([
      // 最近の拡散数
      prisma.repost.count({
        where: {
          userId: userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
          },
        },
      }),

      // 総拡散数
      prisma.repost.count({
        where: {
          userId: userId,
        },
      }),

      // 自分の投稿が拡散された回数
      prisma.repost.count({
        where: {
          post: {
            userId: userId,
          },
        },
      }),

      // 最近自分の投稿が拡散された回数
      prisma.repost.count({
        where: {
          post: {
            userId: userId,
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
          },
        },
      }),
    ]);

    // お気に入り関連の統計を取得
    const [
      favoritesGiven, // 与えたお気に入り数
      recentFavoritesGiven, // 最近与えたお気に入り数（過去30日）
      favoritesReceived, // 受け取ったお気に入り数
      recentFavoritesReceived, // 最近受け取ったお気に入り数（過去30日）
    ] = await Promise.all([
      // 与えたお気に入り数
      prisma.favorite.count({
        where: {
          userId: userId,
        },
      }),

      // 最近与えたお気に入り数
      prisma.favorite.count({
        where: {
          userId: userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
          },
        },
      }),

      // 受け取ったお気に入り数
      prisma.favorite.count({
        where: {
          post: {
            userId: userId,
          },
        },
      }),

      // 最近受け取ったお気に入り数
      prisma.favorite.count({
        where: {
          post: {
            userId: userId,
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
          },
        },
      }),
    ]);

    // フォロー・フォロワー数の取得
    const [followersCount, followingCount] = await Promise.all([
      // フォロワー数
      prisma.follow.count({
        where: {
          followedId: userId,
        },
      }),

      // フォロー数
      prisma.follow.count({
        where: {
          followerId: userId,
        },
      }),
    ]);

    // ユーザー情報の取得（アカウント作成日など）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        rate: true, // データベースに保存されている現在のレート値
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // アカウント年齢（日数）を計算
    const accountAgeDays = Math.max(
      1,
      Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    // 既存のratingライブラリを使用して色を計算
    const color = calculateRating(recentPosts, totalPosts);

    // エンハンストスコアの計算（レート関連機能強化用）
    const enhancedScore =
      recentPosts * 10 + // 最近の投稿に高いウェイト
      recentReposts * 5 + // 最近の拡散
      Math.sqrt(totalPosts) * 15 + // 総投稿数（平方根でスケーリング）
      Math.sqrt(totalReposts) * 7 + // 総拡散数
      Math.sqrt(recentFavoritesReceived) * 8 + // 最近受けたお気に入り
      Math.sqrt(favoritesReceived) * 5 + // 総受け取りお気に入り
      Math.sqrt(followersCount) * 10 + // フォロワー数
      Math.log(accountAgeDays + 1) * 5; // アカウント年齢ボーナス（対数スケール）

    // 最終スコアは既存の方式を尊重しつつ拡張要素も反映
    const baseScore =
      Math.min(recentPosts / 50, 1) * 70 + Math.min(totalPosts / 1000, 1) * 30;
    // 拡散やお気に入りによる補正を加える
    const reposts_bonus =
      Math.sqrt(totalReposts) * 2 + Math.sqrt(recentReposts) * 3;
    const favorites_bonus =
      Math.sqrt(favoritesReceived) * 2 + Math.sqrt(recentFavoritesReceived) * 3;
    // 最終スコア（基本スコア + ボーナス）
    const score = Math.floor(baseScore + reposts_bonus + favorites_bonus);

    // 大幅な変化がある場合のみ、データベースのレート値を更新
    if (user.rate === null || Math.abs(enhancedScore - (user.rate || 0)) > 50) {
      await prisma.user.update({
        where: { id: userId },
        data: { rate: enhancedScore },
      });
    }

    // 既存の型定義に合わせてレスポンスを作成
    const response: UserRating = {
      color: color,
      recentPostCount: recentPosts,
      totalPostCount: totalPosts,
      score: score,
      // 追加の詳細統計情報（拡張）
      stats: {
        posts: {
          total: totalPosts,
          recent: recentPosts,
        },
        reposts: {
          given: {
            total: totalReposts,
            recent: recentReposts,
          },
          received: {
            total: receivedRepostsCount,
            recent: recentReceivedReposts,
          },
        },
        favorites: {
          given: {
            total: favoritesGiven,
            recent: recentFavoritesGiven,
          },
          received: {
            total: favoritesReceived,
            recent: recentFavoritesReceived,
          },
        },
        followers: followersCount,
        following: followingCount,
        accountAgeDays: accountAgeDays,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Rating Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch rating" },
      { status: 500 }
    );
  }
}
