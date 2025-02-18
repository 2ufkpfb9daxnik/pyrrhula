import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    isAdmin: boolean;
    icon: string | null;
    rate: number;
    postCount: number;
  }

  interface Session {
    user: User;
  }
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    username: string;
    isAdmin: boolean;
    icon: string | null;
    rate: number;
    postCount: number;
  };
}

export interface SignupRequest {
  id: string; // ユーザーID（16文字以内）
  username: string; // 表示名（32文字以内）
  password: string; // パスワード
}

export interface SignupResponse {
  user: {
    id: string;
    username: string;
    icon: string | null;
    createdAt: Date;
  };
}
