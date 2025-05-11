import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = 10;

    // フォローしているリストを取得
    const lists = await prisma.lists.findMany({
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: {
        list_followers: {
          some: {
            user_id: session.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        creator_id: true,
        is_managed: true,
        created_at: true,
        User: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
        list_members: {
          where: {
            user_id: session.user.id,
          },
        },
        list_followers: {
          where: {
            user_id: session.user.id,
          },
        },
        _count: {
          select: {
            list_members: true,
            list_followers: true,
            Post: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    let nextCursor: string | undefined;
    if (lists.length > limit) {
      const nextItem = lists.pop();
      nextCursor = nextItem?.id;
    }

    const formattedLists = lists.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      creatorId: list.creator_id,
      isManaged: list.is_managed ?? false,
      createdAt: list.created_at?.toISOString() ?? new Date().toISOString(),
      creator: {
        id: list.User.id,
        username: list.User.username,
        icon: list.User.icon,
      },
      _count: {
        members: list._count?.list_members ?? 0,
        followers: list._count?.list_followers ?? 0,
        posts: list._count?.Post ?? 0,
      },
      isMember: list.list_members.length > 0,
      isFollowing: list.list_followers.length > 0,
      isAdmin:
        list.creator_id === session.user.id ||
        list.list_members.some((m) => m.is_admin),
      memberStatus: list.list_members[0]?.status as
        | "pending"
        | "approved"
        | undefined,
    }));

    return NextResponse.json({
      lists: formattedLists,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching followed lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch followed lists" },
      { status: 500 }
    );
  }
}
