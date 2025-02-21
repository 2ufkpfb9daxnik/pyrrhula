import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcrypt";
import type { NextAuthOptions } from "next-auth";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        id: {
          label: "ユーザーID",
          type: "text",
          placeholder: "あなたのユーザーID",
        },
        password: {
          label: "パスワード",
          type: "password",
          placeholder: "••••••••",
        },
      },
      async authorize(credentials) {
        console.log("認証処理開始");
        if (!credentials?.id || !credentials?.password) {
          console.log("認証情報不足");
          throw new Error("認証情報が不足しています");
        }

        try {
          console.log("DB接続開始:", credentials.id);
          const user = await prisma.user.findUnique({
            where: { id: credentials.id },
            select: {
              id: true,
              username: true,
              password: true,
              isAdmin: true,
              icon: true,
              rate: true,
              postCount: true,
            },
          });
          console.log(
            "ユーザー検索結果:",
            user ? "見つかりました" : "見つかりません"
          );

          if (!user) {
            console.log("ユーザーが存在しません");
            throw new Error("ユーザーIDまたはパスワードが正しくありません");
          }

          const isValid = await compare(credentials.password, user.password);
          console.log("パスワード検証:", isValid ? "成功" : "失敗");

          if (!isValid) {
            console.log("パスワード不一致");
            throw new Error("ユーザーIDまたはパスワードが正しくありません");
          }

          console.log("認証成功:", user.id);
          return {
            id: user.id,
            name: user.username,
            isAdmin: user.isAdmin,
            username: user.username,
            icon: user.icon,
            rate: user.rate,
            postCount: user.postCount,
          };
        } catch (error) {
          console.error("認証エラー詳細:", error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login?error=true",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      console.log("JWT処理開始:", {
        trigger,
        hasUser: !!user,
        hasSession: !!session,
      });

      if (trigger === "update" && session) {
        console.log("セッション更新:", session.user);
        return { ...token, ...session.user };
      }

      if (user) {
        console.log("初回ログイントークン生成:", user.id);
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.username = user.username;
        token.icon = user.icon;
        token.rate = user.rate;
        token.postCount = user.postCount;
      }

      return token;
    },
    async session({ session, token }) {
      console.log("セッション生成開始:", { hasToken: !!token });

      if (token) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.username = token.username as string;
        session.user.icon = token.icon as string | null;
        session.user.rate = token.rate as number;
        session.user.postCount = token.postCount as number;
        console.log("セッション生成完了:", session.user.id);
      }

      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  debug: true, // デバッグモードを常に有効化
});

export { handler as GET, handler as POST };
