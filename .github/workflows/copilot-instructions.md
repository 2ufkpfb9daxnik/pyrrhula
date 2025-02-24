# System Prompt for GitHub Copilot

- Please respond in Japanese.
- When providing code, specify the file path, such as `src/app/_types/user.ts`.
- When writing a `return` statement, avoid using `// ... existing code ...` to omit parts of the function. Instead, write the full content unless it is already clearly structured with new lines and indentation.
- Indentation should use two spaces, and the `return` statement should be formatted for readability without being enclosed in `<...>`.
- If any new commands need to be executed, please provide the necessary command as well.
- Below is the content of `schema.prisma`:

// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// このファイルを更新したら...
// 0. `npm run dev` や `npx prisma studio` を停止
// 1. dev.db を削除
// 2. npx prisma db push
// 3. npx prisma generate
// 4. npx prisma db seed

//本番運用の開始後は npx prisma migrate という「既存レコードを残したままスキーマを変更するコマンド」を使用してください

//本番環境に移行する前： npx prisma migrate dev --name init

generator client {
provider = "prisma-client-js"
previewFeatures = ["referentialIntegrity"]
}

datasource db {
provider = "postgresql"
url = env("DATABASE_URL")
directUrl = env("DIRECT_URL")
}

model User {
id String @id @map("user_id") @db.VarChar(16) // ユーザー ID（最大 16 文字）
username String @unique @db.VarChar(32) // 表示名（最大 32 文字）
password String // ハッシュ化されたパスワード
icon String? // アイコン（URL または NULL）
isAdmin Boolean @default(false) // 管理者フラグ
createdAt DateTime @default(now()) // アカウント作成日時

// プロフィール関連
profile String? @db.Text // プロフィール文

// 統計情報
followersCount Int @default(0) // フォロワー数
followingCount Int @default(0) // フォロー数

// アクション履歴
repliedPosts Post[] @relation("UserReplies") // 返信した投稿
favoritePosts Favorite[] @relation("UserFavorites") // お気に入りした投稿
repostedPosts Repost[] @relation("UserReposts") // 拡散した投稿

// レート関連
rate Int @default(0) // レート（投稿数と100投稿の速度で判定）
postCount Int @default(0) // 総投稿数

// 投稿関連
posts Post[]

// フォロー関連
follows Follow[] @relation("Following")
followers Follow[] @relation("Followers")

// お気に入り・拡散関連
favorites Favorite[] @relation("UserFavoritePosts")
reposts Repost[] @relation("UserRepostedPosts")

// チャット関連
sentChats Chat[] @relation("ChatSender")
receivedChats Chat[] @relation("ChatReceiver")

// 通知関連
receivedNotifications Notification[] @relation("NotificationReceiver")
sentNotifications Notification[] @relation("NotificationSender")

// ブロック関連
blocking Block[] @relation("Blocking") // ブロックしているユーザー
blockedBy Block[] @relation("BlockedBy") // ブロックされているユーザー

// ミュート関連
muting Mute[] @relation("Muting") // ミュートしているユーザー
mutedBy Mute[] @relation("MutedBy") // ミュートされているユーザー
}

model Post {
id String @id @default(uuid())
user User @relation(fields: [userId], references: [id])
userId String
content String
createdAt DateTime @default(now())
favorites Int @default(0)
reposts Int @default(0)
parentId String? // 返信元の投稿
parent Post? @relation("Replies", fields: [parentId], references: [id])
replies Post[] @relation("Replies")

// ユーザーのアクション履歴との関連
repliedBy User[] @relation("UserReplies") // 返信したユーザー
favoritedBy Favorite[] // お気に入りしたユーザー
repostedBy Repost[] // 拡散したユーザー

// 関連する通知
notifications Notification[]

@@index([userId])
@@index([parentId])
}

model Follow {
id String @id @default(uuid())
follower User @relation("Following", fields: [followerId], references: [id])
followerId String
followed User @relation("Followers", fields: [followedId], references: [id])
followedId String
createdAt DateTime @default(now())

@@unique([followerId, followedId])
}

model Chat {
id String @id @default(cuid()) // ユニークなメッセージ ID
senderId String @db.VarChar(16) // 送信者のユーザー ID
receiverId String @db.VarChar(16) // 受信者のユーザー ID
message String // メッセージ内容（テキストのみ）
createdAt DateTime @default(now()) // 送信日時
isDeleted Boolean @default(false) // 削除フラグ（admin のみ変更可）
notifications Notification[]

sender User @relation("ChatSender", fields: [senderId], references: [id])
receiver User @relation("ChatReceiver", fields: [receiverId], references: [id])

@@index([senderId])
@@index([receiverId])
}

model Notification {
id String @id @default(cuid())
receiverId String @db.VarChar(16)
senderId String? @db.VarChar(16)
type String @db.VarChar(8) // さらに短く制限
relatedPostId String?
createdAt DateTime @default(now())
post Post? @relation(fields: [relatedPostId], references: [id])

receiver User @relation("NotificationReceiver", fields: [receiverId], references: [id])
sender User? @relation("NotificationSender", fields: [senderId], references: [id])
Chat Chat? @relation(fields: [chatId], references: [id])
chatId String?

@@index([receiverId])
@@index([senderId])
}

// お気に入りの中間テーブル
model Favorite {
id String @id @default(uuid())
post Post @relation(fields: [postId], references: [id])
postId String
user User @relation("UserFavoritePosts", fields: [userId], references: [id], map: "favorite_user_fkey")
userId String
favoriteBy User @relation("UserFavorites", fields: [userId], references: [id], map: "favorite_by_user_fkey")
createdAt DateTime @default(now())

@@unique([postId, userId])
@@index([postId])
@@index([userId])
}

// 拡散の中間テーブル
model Repost {
id String @id @default(uuid())
post Post @relation(fields: [postId], references: [id])
postId String
user User @relation("UserRepostedPosts", fields: [userId], references: [id], map: "repost_user_fkey")
userId String
repostedBy User @relation("UserReposts", fields: [userId], references: [id], map: "repost_by_user_fkey")
createdAt DateTime @default(now())

@@unique([postId, userId])
@@index([postId])
@@index([userId])
}

// ブロックの中間テーブル
model Block {
id String @id @default(uuid())
blocker User @relation("Blocking", fields: [blockerId], references: [id])
blockerId String
blocked User @relation("BlockedBy", fields: [blockedId], references: [id])
blockedId String
createdAt DateTime @default(now())

@@unique([blockerId, blockedId])
@@index([blockerId])
@@index([blockedId])
}

// ミュートの中間テーブル
model Mute {
id String @id @default(uuid())
muter User @relation("Muting", fields: [muterId], references: [id])
muterId String
muted User @relation("MutedBy", fields: [mutedId], references: [id])
mutedId String
createdAt DateTime @default(now())

@@unique([muterId, mutedId])
@@index([muterId])
@@index([mutedId])
}
