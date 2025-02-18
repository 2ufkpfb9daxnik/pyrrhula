import {
  NextAuthOptions,
  User as NextAuthUser,
  Session as NextAuthSession,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import { compare } from "bcrypt";

interface User extends NextAuthUser {
  isAdmin: boolean;
  username: string;
}

declare module "next-auth" {
  interface Session {
    user: User;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            username: credentials.username,
          },
        });

        if (!user) {
          return null;
        }

        const isValidPassword = await compare(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          ...user,
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
        } as User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        if ("username" in user) {
          token.username = user.username;
        }
        if ("isAdmin" in user) {
          token.isAdmin = user.isAdmin;
        }
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: NextAuthSession;
      token: any;
    }) {
      if (token) {
        if (session.user) {
          session.user.id = token.id;
          session.user.username = token.username;
          session.user.isAdmin = token.isAdmin;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
};
