import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcrypt";
import type { NextAuthOptions } from "next-auth";

// NextAuth の設定
const nextAuthOptions: NextAuthOptions = {
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
        if (!credentials?.id || !credentials?.password) {
          throw new Error("認証情報が不足しています");
        }
        try {
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

          if (!user || !(await compare(credentials.password, user.password))) {
            throw new Error("ユーザーIDまたはパスワードが正しくありません");
          }

          // 認証成功
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
          console.error("認証エラー:", error);
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
    // JWTの取り扱い
    async jwt({ token, user, trigger, session }) {
      // セッション更新要求（profileのupdateなど）時
      if (trigger === "update" && session) {
        return { ...token, ...session.user };
      }
      // 初回ログイン時
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.username = user.username;
        token.icon = user.icon;
        token.rate = user.rate;
        token.postCount = user.postCount;
      }
      return token;
    },
    // セッション生成時
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.username = token.username as string;
        session.user.icon = token.icon as string | null;
        session.user.rate = token.rate as number;
        session.user.postCount = token.postCount as number;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  debug: process.env.NODE_ENV === "development",
};

// NextAuth ハンドラー
const handler = NextAuth(nextAuthOptions);

// Route Handlers としてエクスポート
export { handler as GET, handler as POST };
