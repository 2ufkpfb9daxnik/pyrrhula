import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // グループの存在確認とアクセス権限の確認
    const groupChat = await prisma.groupChat.findUnique({
      where: {
        id: params.id,
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
    });

    if (!groupChat) {
      return NextResponse.json(
        { error: "グループが見つかりません" },
        { status: 404 }
      );
    }

    // ユーザーがグループのメンバーかどうか確認
    const isMember = groupChat.members.some(
      (member) => member.user.id === session.user.id
    );

    if (!isMember) {
      return NextResponse.json(
        { error: "このグループにアクセスする権限がありません" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: groupChat.id,
      name: groupChat.name,
      members: groupChat.members,
      messages: groupChat.messages.map((message) => ({
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        senderId: message.senderId,
        sender: {
          username: message.sender.username,
          icon: message.sender.icon,
        },
      })),
    });
  } catch (error) {
    console.error("グループチャット取得エラー:", error);
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

    const { content } = await req.json();

    // コンテンツの検証
    if (!content?.trim()) {
      return NextResponse.json(
        { error: "メッセージを入力してください" },
        { status: 400 }
      );
    }

    // グループとメンバーシップの確認
    const groupChat = await prisma.groupChat.findUnique({
      where: {
        id: params.id,
      },
      include: {
        members: true,
      },
    });

    if (!groupChat) {
      return NextResponse.json(
        { error: "グループが見つかりません" },
        { status: 404 }
      );
    }

    const isMember = groupChat.members.some(
      (member) => member.userId === session.user.id
    );

    if (!isMember) {
      return NextResponse.json(
        { error: "このグループにメッセージを送信する権限がありません" },
        { status: 403 }
      );
    }
    // メッセージの作成
    const message = await prisma.groupMessage.create({
      data: {
        content,
        groupChatId: params.id, // group_id から groupChatId に変更
        senderId: session.user.id, // sender_id から senderId に変更
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      senderId: message.senderId,
      sender: message.sender,
    });
  } catch (error) {
    console.error("メッセージ送信エラー:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
