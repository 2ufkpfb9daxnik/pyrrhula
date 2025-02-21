import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcrypt";
import { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        id: { label: "ユーザーID", type: "text" },
        password: { label: "パスワード", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.id || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { id: credentials.id },
            select: {
              id: true,
              username: true,
              password: true,
              isAdmin: true,
            },
          });

          if (!user || !await compare(credentials.password, user.password)) {
            console.log("認証失敗");
            return null;
          }

          console.log("認証成功:", user.id);
          return {
            id: user.id,
            name: user.username,
            isAdmin: user.isAdmin,
            username: user.username,
            icon: null,
            rate: 0,
            postCount: 0
          };
        } catch (error) {
          console.error("認証エラー:", error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };