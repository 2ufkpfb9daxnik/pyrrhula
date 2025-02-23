import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type {
  ChatMessage,
  ChatPostRequest,
  ChatHistoryResponse,
} from "@/app/_types/chat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log("GETリクエスト受信:", { params, url: req.url });

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("未認証アクセス");
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 対象ユーザーの存在確認
    const otherUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        icon: true,
      },
    });

    if (!otherUser) {
      console.log("ユーザーが見つかりません:", params.id);
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // チャットルームとメッセージを一度に取得
    const chatData = await prisma.chatRoom.findFirst({
      where: {
        participants: {
          every: {
            userId: {
              in: [session.user.id, params.id],
            },
          },
        },
      },
      select: {
        id: true,
        messages: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
          select: {
            id: true,
            message: true,
            createdAt: true,
            senderId: true,
          },
        },
      },
    });

    const messages = chatData?.messages ?? [];
    console.log(`${messages.length}件のメッセージを取得`);

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      message: msg.message,
      createdAt: msg.createdAt,
      isOwnMessage: msg.senderId === session.user.id,
    }));

    return NextResponse.json({
      messages: formattedMessages,
      hasMore: messages.length === 50,
      otherUser,
    });
  } catch (error) {
    console.error("[チャット履歴エラー]:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log("POSTリクエスト受信:", { params });

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 自分自身へのメッセージを防止
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: "自分自身にメッセージを送ることはできません" },
        { status: 400 }
      );
    }

    const body: ChatPostRequest = await req.json();
    if (!body.message?.trim()) {
      return NextResponse.json(
        { error: "メッセージを入力してください" },
        { status: 400 }
      );
    }

    // ユーザーの存在確認とチャットルームの取得/作成を一つのトランザクションで
    const result = await prisma.$transaction(async (tx) => {
      const otherUser = await tx.user.findUnique({
        where: { id: params.id },
        select: { id: true },
      });

      if (!otherUser) {
        throw new Error("ユーザーが見つかりません");
      }

      let chatRoom = await tx.chatRoom.findFirst({
        where: {
          participants: {
            every: {
              userId: {
                in: [session.user.id, params.id],
              },
            },
          },
        },
        select: { id: true },
      });

      if (!chatRoom) {
        chatRoom = await tx.chatRoom.create({
          data: {
            participants: {
              create: [{ userId: session.user.id }, { userId: params.id }],
            },
          },
        });
      }

      const message = await tx.chat.create({
        data: {
          senderId: session.user.id,
          receiverId: params.id,
          message: body.message.trim(),
          chatRoomId: chatRoom.id,
        },
        select: {
          id: true,
          message: true,
          createdAt: true,
          senderId: true,
        },
      });

      await tx.notification.create({
        data: {
          type: "msg",
          senderId: session.user.id,
          receiverId: params.id,
        },
      });

      return message;
    });

    console.log("メッセージ送信成功:", result.id);

    return NextResponse.json({
      id: result.id,
      message: result.message,
      createdAt: result.createdAt,
      isOwnMessage: true,
    });
  } catch (error) {
    console.error("[チャット送信エラー]:", error);
    const message =
      error instanceof Error ? error.message : "サーバーエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
