import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, memberIds } = await req.json();
    console.log("Request received:", {
      name,
      memberIds,
      sessionUser: session.user,
    });

    if (!name || !memberIds || !Array.isArray(memberIds)) {
      console.log("Invalid request format:", { name, memberIds });
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    // セッションユーザーのIDを除外した上でメンバーの存在確認
    const uniqueMemberIds = [
      ...new Set(memberIds.filter((id) => id !== session.user.id)),
    ];

    // メンバーの存在確認
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueMemberIds,
        },
      },
    });

    console.log("Found users:", users);
    console.log("Expected users count:", uniqueMemberIds.length);
    console.log("Actual users count:", users.length);

    if (users.length !== uniqueMemberIds.length) {
      return NextResponse.json(
        {
          error: "Invalid member IDs",
          details: {
            expected: uniqueMemberIds.length,
            found: users.length,
            requestedIds: uniqueMemberIds,
            foundIds: users.map((u) => u.id),
          },
        },
        { status: 400 }
      );
    }

    // グループチャットの作成
    const groupChat = await prisma.groupChat.create({
      data: {
        name,
        members: {
          create: [
            { userId: session.user.id },
            ...uniqueMemberIds.map((id: string) => ({
              userId: id,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
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

    // レスポンスデータの形式を調整
    return NextResponse.json({
      id: groupChat.id,
      name: groupChat.name,
      members: groupChat.members.map((member) => ({
        user_id: member.user.id, // 返却時にuser_idとして変換
        username: member.user.username,
        icon: member.user.icon,
      })),
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ユーザーが所属するグループチャットを取得
    const groupChats = await prisma.groupChat.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                icon: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // 最新のメッセージのみを取得
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                icon: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc", // 最新の更新順に並び替え
      },
    });

    // レスポンスデータの形式を調整
    return NextResponse.json(
      groupChats.map((chat) => ({
        id: chat.id,
        name: chat.name,
        members: chat.members.map((member) => ({
          user_id: member.user.id,
          username: member.user.username,
          icon: member.user.icon,
        })),
        lastMessage: chat.messages[0]
          ? {
              id: chat.messages[0].id,
              content: chat.messages[0].content,
              createdAt: chat.messages[0].createdAt,
              sender: {
                id: chat.messages[0].sender.id,
                username: chat.messages[0].sender.username,
                icon: chat.messages[0].sender.icon,
              },
            }
          : null,
        updatedAt: chat.updatedAt,
      }))
    );
  } catch (error) {
    console.error("グループチャット一覧取得エラー:", error);
    return NextResponse.json(
      { error: "グループチャット一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
