import { ListHeader } from "@/app/_components/ListHeader";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import type { ListResponse } from "@/app/_types/list";
import type { User } from "@/app/_types/user";

interface Props {
  params: {
    listId: string;
  };
}

export default async function ListFollowersPage({ params }: Props) {
  const { listId } = params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const list = await prisma.lists.findUnique({
    where: {
      id: listId,
    },
    include: {
      User: {
        select: {
          id: true,
          username: true,
          icon: true,
        },
      },
      list_followers: {
        where: {
          user_id: userId,
        },
      },
      list_members: {
        where: {
          user_id: userId,
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
  });

  if (!list) {
    notFound();
  }

  const followers = await prisma.list_followers.findMany({
    where: {
      list_id: listId,
    },
    include: {
      User: {
        select: {
          id: true,
          username: true,
          icon: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const creator: User = {
    id: list.User.id,
    username: list.User.username,
    icon: list.User.icon,
  };

  const listResponse: ListResponse = {
    list: {
      id: list.id,
      name: list.name,
      description: list.description,
      creatorId: list.creator_id,
      isManaged: list.is_managed ?? false,
      includeTimelinePosts: list.include_timeline_posts ?? false,
      createdAt: list.created_at?.toISOString() ?? new Date().toISOString(),
      creator,
      _count: {
        members: list._count?.list_members ?? 0,
        followers: list._count?.list_followers ?? 0,
        posts: list._count?.Post ?? 0,
      },
    },
    isFollowing: list.list_followers.length > 0,
    isMember: list.list_members.length > 0,
    isAdmin:
      list.creator_id === userId || list.list_members.some((m) => m.is_admin),
    memberStatus: list.list_members[0]?.status as
      | "pending"
      | "approved"
      | undefined,
  };

  return (
    <div className="min-h-screen">
      <ListHeader list={listResponse} />
      <div className="p-4">
        <h2 className="mb-4 text-xl font-bold">フォロワー</h2>
        {followers.length > 0 ? (
          <div className="space-y-4">
            {followers.map((follower) => (
              <Link
                key={follower.User.id}
                href={`/user/${follower.User.id}`}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-800/50"
              >
                <Avatar>
                  <AvatarImage src={follower.User.icon ?? undefined} />
                  <AvatarFallback>
                    {follower.User.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{follower.User.username}</div>
                  <div className="text-sm text-muted-foreground">
                    @{follower.User.id}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            まだフォロワーがいません
          </p>
        )}
      </div>
    </div>
  );
}
