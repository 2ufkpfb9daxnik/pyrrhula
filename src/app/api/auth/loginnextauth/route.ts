import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcrypt";

const handler = NextAuth({
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
              icon: true,
              rate: true,
              postCount: true,
            },
          });

          if (!user || !(await compare(credentials.password, user.password))) {
            return null;
          }

          return {
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            icon: user.icon,
            rate: user.rate,
            postCount: user.postCount,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    error: '/login', // エラーページをログインページに変更
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = token.user as any;
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };