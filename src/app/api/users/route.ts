// users/                  GET                 ユーザー一覧取得
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { UserListResponse } from "@/app/_types/users";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "rate";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const totalUsers = await prisma.user.count();

    const users = await prisma.user.findMany({
      take: limit,
      skip: skip,
      orderBy: {
        [sort]: "desc",
      },
      select: {
        id: true,
        username: true,
        icon: true,
        rate: true,
        postCount: true,
        createdAt: true,
        followers: session?.user
          ? {
              where: {
                followerId: session.user.id,
              },
              select: {
                followerId: true,
              },
            }
          : undefined,
      },
    });

    const formattedUsers = users.map((user) => ({
      ...user,
      isFollowing: user.followers?.length > 0,
      followers: undefined,
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit),
        currentPage: page,
        hasMore: page * limit < totalUsers,
      },
    });
  } catch (error) {
    console.error("[Users Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
