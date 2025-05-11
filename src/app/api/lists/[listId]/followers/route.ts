import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listId = params.listId;

    // リストの存在確認
    const list = await prisma.lists.findUnique({
      where: { id: listId },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // 既にフォローしているかチェック
    const existingFollow = await prisma.list_followers.findUnique({
      where: {
        list_id_user_id: {
          list_id: listId,
          user_id: session.user.id,
        },
      },
    });

    if (existingFollow) {
      return NextResponse.json(
        { error: "Already following this list" },
        { status: 400 }
      );
    }

    // フォロー関係を作成
    const follow = await prisma.list_followers.create({
      data: {
        list_id: listId,
        user_id: session.user.id,
      },
    });

    return NextResponse.json(follow);
  } catch (error) {
    console.error("Error following list:", error);
    return NextResponse.json(
      { error: "Failed to follow list" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listId = params.listId;

    // フォロー関係を削除
    await prisma.list_followers.delete({
      where: {
        list_id_user_id: {
          list_id: listId,
          user_id: session.user.id,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unfollowing list:", error);
    return NextResponse.json(
      { error: "Failed to unfollow list" },
      { status: 500 }
    );
  }
}

// フォロワー一覧を取得
export async function GET(
  request: Request,
  { params }: { params: { listId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listId = params.listId;

    const followers = await prisma.list_followers.findMany({
      where: { list_id: listId },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            icon: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ followers });
  } catch (error) {
    console.error("Error fetching list followers:", error);
    return NextResponse.json(
      { error: "Failed to fetch list followers" },
      { status: 500 }
    );
  }
}
