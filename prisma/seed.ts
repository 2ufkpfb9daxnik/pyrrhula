import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

const main = async () => {
  // 管理者アカウントの作成
  const adminUser = await prisma.user.create({
    data: {
      id: "admin",
      username: "システム管理者",
      password: await hash("admin123", 10), // パスワードをハッシュ化
      isAdmin: true,
      icon: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
    },
  });

  // 一般ユーザーアカウントの作成
  const normalUser = await prisma.user.create({
    data: {
      id: "user1",
      username: "一般ユーザー1",
      password: await hash("user123", 10),
      isAdmin: false,
      icon: "https://api.dicebear.com/7.x/bottts/svg?seed=user1",
    },
  });

  // 管理者の投稿を作成
  const adminPost = await prisma.post.create({
    data: {
      userId: adminUser.id,
      content: "はじめまして！システム管理者です。このSNSへようこそ！",
      favorites: 1,
      shares: 1,
    },
  });

  // 一般ユーザーの投稿を作成
  const userPost = await prisma.post.create({
    data: {
      userId: normalUser.id,
      content: "初めての投稿です！よろしくお願いします！",
      favorites: 0,
      shares: 0,
    },
  });

  // 一般ユーザーから管理者への返信を作成
  await prisma.post.create({
    data: {
      userId: normalUser.id,
      content: "よろしくお願いします！",
      parentId: adminPost.id,
      favorites: 1,
      shares: 0,
    },
  });

  // フォロー関係を作成
  await prisma.follow.create({
    data: {
      followerId: normalUser.id,
      followedId: adminUser.id,
    },
  });

  // チャットメッセージを作成
  await prisma.chat.create({
    data: {
      senderId: normalUser.id,
      receiverId: adminUser.id,
      message: "初めまして！よろしくお願いします。",
    },
  });

  // 通知を作成
  await prisma.notification.create({
    data: {
      receiverId: adminUser.id,
      senderId: normalUser.id,
      type: "follow",
      isRead: false,
    },
  });

  console.log("🌱 シードデータの作成が完了しました");
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
