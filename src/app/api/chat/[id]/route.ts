import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type {
  ChatMessage,
  ChatPostRequest,
  ChatHistoryResponse,
} from "@/app/_types/chat";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 50;

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

    const hasMore = messages.length > limit;
    const nextCursor = hasMore ? messages[limit - 1].id : undefined;
    const messageList = hasMore ? messages.slice(0, -1) : messages;

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

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: "Cannot send message to yourself" },
        { status: 400 }
      );
    }

    const body: ChatPostRequest = await req.json();

    if (!body.message.trim()) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    const receiver = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "Receiver not found" },
        { status: 404 }
      );
    }

    const [message, _] = await prisma.$transaction([
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
      prisma.notification.create({
        data: {
          type: "msg",
          senderId: session.user.id,
          receiverId: params.id,
        },
      }),
    ]);

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
