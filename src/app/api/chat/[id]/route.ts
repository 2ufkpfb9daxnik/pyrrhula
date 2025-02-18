// chat/[id]               GET/POST            チャット個別ページ取得/送信
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type {
  ChatMessage,
  ChatPostRequest,
  ChatHistoryResponse,
} from "@/app/_types/chat";

// チャット履歴の取得
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 相手のユーザーの存在確認と情報取得
    const otherUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        icon: true,
      },
    });

    if (!otherUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ページネーションのパラメータ
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 50;

    // チャット履歴を取得（自分と相手のメッセージのみ）
    const messages = await prisma.chat.findMany({
      where: {
        OR: [
          {
            AND: [{ senderId: session.user.id }, { receiverId: params.id }],
          },
          {
            AND: [{ senderId: params.id }, { receiverId: session.user.id }],
          },
        ],
        isDeleted: false,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        message: true,
        createdAt: true,
        senderId: true,
      },
    });

    // 次ページの有無を確認
    const hasMore = messages.length > limit;
    const nextCursor = hasMore ? messages[limit - 1].id : undefined;
    const messageList = hasMore ? messages.slice(0, -1) : messages;

    // メッセージを整形（自分のメッセージかどうかのフラグを追加）
    const formattedMessages = messageList.map((msg) => ({
      id: msg.id,
      message: msg.message,
      createdAt: msg.createdAt,
      isOwnMessage: msg.senderId === session.user.id,
    }));

    const response: ChatHistoryResponse = {
      messages: formattedMessages,
      hasMore,
      ...(nextCursor && { nextCursor }),
      otherUser,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Chat History Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// メッセージの送信
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 自分自身へのメッセージを防止
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: "Cannot send message to yourself" },
        { status: 400 }
      );
    }

    const body: ChatPostRequest = await req.json();

    // メッセージのバリデーション
    if (!body.message.trim()) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    // 受信者の存在確認
    const receiver = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "Receiver not found" },
        { status: 404 }
      );
    }

    // トランザクションでメッセージと通知を作成
    const [message, _] = await prisma.$transaction([
      // メッセージを作成
      prisma.chat.create({
        data: {
          senderId: session.user.id,
          receiverId: params.id,
          message: body.message.trim(),
        },
        select: {
          id: true,
          message: true,
          createdAt: true,
          senderId: true,
          receiverId: true,
        },
      }),
      // チャット通知を作成
      prisma.notification.create({
        data: {
          type: "msg",
          senderId: session.user.id,
          receiverId: params.id,
        },
      }),
    ]);

    // レスポンスを整形
    const formattedMessage = {
      id: message.id,
      message: message.message,
      createdAt: message.createdAt,
      isOwnMessage: true,
    };

    return NextResponse.json(formattedMessage, { status: 201 });
  } catch (error) {
    console.error("[Chat Send Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
