import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

const main = async () => {
  // 既存データの削除
  await prisma.notification.deleteMany({});
  await prisma.chat.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.repost.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.user.deleteMany({});

  // 管理者アカウントの作成
  const adminUser = await prisma.user.create({
    data: {
      id: "admin",
      username: "管理者",
      password: await hash("admin123", 10),
      isAdmin: true,
      icon: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
      rate: 0, // 初期レート
      postCount: 0, // 初期投稿数
    },
  });

  // 一般ユーザーアカウントの作成
  const normalUser = await prisma.user.create({
    data: {
      id: "user1",
      username: "ユーザー",
      password: await hash("user123", 10),
      isAdmin: false,
      icon: "https://api.dicebear.com/7.x/bottts/svg?seed=user1",
      rate: 0, // 初期レート
      postCount: 0, // 初期投稿数
    },
  });

  // 管理者の投稿を作成し、投稿数を更新
  const adminPost = await prisma.post.create({
    data: {
      userId: adminUser.id,
      content: "管理者が投稿します。このSNSへようこそ！",
    },
  });
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { postCount: { increment: 1 } },
  });

  // 一般ユーザーの投稿を作成し、投稿数を更新
  const userPost = await prisma.post.create({
    data: {
      userId: normalUser.id,
      content: "初めての投稿です！",
    },
  });
  await prisma.user.update({
    where: { id: normalUser.id },
    data: { postCount: { increment: 1 } },
  });

  // 一般ユーザーから管理者への返信を作成し、投稿数を更新
  const replyPost = await prisma.post.create({
    data: {
      userId: normalUser.id,
      content: "よろしくお願いします！",
      parentId: adminPost.id,
    },
  });
  await prisma.user.update({
    where: { id: normalUser.id },
    data: { postCount: { increment: 1 } },
  });

  // お気に入り関係を作成
  await prisma.favorite.create({
    data: {
      userId: normalUser.id,
      postId: adminPost.id,
    },
  });

  // 自動的にカウントを増やす
  await prisma.post.update({
    where: { id: adminPost.id },
    data: { favorites: { increment: 1 } },
  });

  // 拡散関係を作成
  await prisma.repost.create({
    data: {
      userId: normalUser.id,
      postId: adminPost.id,
    },
  });

  // 自動的にカウントを増やす
  await prisma.post.update({
    where: { id: adminPost.id },
    data: { reposts: { increment: 1 } },
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

  // フォロー通知を作成
  await prisma.notification.create({
    data: {
      receiverId: adminUser.id,
      senderId: normalUser.id,
      type: "fol", // follow -> fol
    },
  });

  // お気に入り通知を作成
  await prisma.notification.create({
    data: {
      receiverId: adminUser.id,
      senderId: normalUser.id,
      type: "fav",
      relatedPostId: adminPost.id,
    },
  });

  console.log("🌱 シードデータの作成が完了しました");
}; // main関数の終了

// main関数の呼び出しを関数定義の外に移動
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
