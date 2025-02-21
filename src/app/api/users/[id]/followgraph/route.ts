import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// インターフェースを更新
interface UserNode {
  id: string;
  username: string;
  icon: string | null;
  followers: string[];
  following: string[];
  depth: number;
  children: UserNode[];
}

async function getFollowGraph(
  userId: string,
  depth: number = 0,
  maxDepth: number = 2,
  processed = new Set<string>()
): Promise<UserNode | null> {
  if (processed.has(userId) || depth > maxDepth) return null;
  processed.add(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      followers: {
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              icon: true,
            },
          },
        },
      },
      follows: {
        include: {
          followed: {
            select: {
              id: true,
              username: true,
              icon: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const followers = user.followers.map((f) => f.follower.id);
  const following = user.follows.map((f) => f.followed.id);

  const result: UserNode = {
    id: user.id,
    username: user.username,
    icon: user.icon,
    followers,
    following,
    depth,
    children: [],
  };

  if (depth < maxDepth) {
    const nextNodes = Array.from(new Set([...followers, ...following]));

    const childPromises = nextNodes.map(async (nodeId) => {
      if (!processed.has(nodeId)) {
        return getFollowGraph(nodeId, depth + 1, maxDepth, processed);
      }
      return null;
    });

    result.children = (await Promise.all(childPromises)).filter(
      (node): node is UserNode => node !== null
    );
  }

  return result;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rootUser = await getFollowGraph(params.id);
    if (!rootUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: rootUser });
  } catch (error) {
    console.error("[Follow Graph Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
