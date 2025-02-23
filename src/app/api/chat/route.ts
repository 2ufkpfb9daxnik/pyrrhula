// chat/                   GET                 チャット一覧取得
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { ChatListResponse } from "@/app/_types/chat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 20;

    // ログインユーザーのチャットのみを取得
    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { senderId: session.user.id }, // 自分が送信者
          { receiverId: session.user.id }, // 自分が受信者
        ],
        isDeleted: false,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
      },
    });

    // 次ページの有無を確認
    const hasMore = chats.length > limit;
    const nextCursor = hasMore ? chats[limit - 1].id : undefined;
    const chatList = hasMore ? chats.slice(0, -1) : chats;

    // 相手のユーザー情報のみを返すように整形
    const formattedChats = chatList.map((chat) => {
      const otherUser =
        chat.senderId === session.user.id ? chat.receiver : chat.sender;

      return {
        id: chat.id,
        message: chat.message,
        createdAt: chat.createdAt,
        isOwnMessage: chat.senderId === session.user.id,
        otherUser: {
          id: otherUser.id,
          username: otherUser.username,
          icon: otherUser.icon,
        },
      };
    });

    const response: ChatListResponse = {
      chats: formattedChats,
      hasMore,
      ...(nextCursor && { nextCursor }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Chat List Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
