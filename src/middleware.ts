import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 認証が不要なパスのリスト
const publicPaths = [
  "/api/login",
  "/api/auth",
  "/api/signup",
  "/api/users",
  "/api/posts",
  "/api/search",
  "/api/landing",
  "/api/users/[id]/rating",
  "/api/users/[id]/posts",
  "/api/users/[id]/followers",
  "/api/users/[id]/following",
  "/api/users/[id]/favorite",
  "/api/users/[id]/repost",
  "/api/users/[id]/reply",
  "/api/whole",
];

export async function middleware(request: NextRequest) {
  // パスの取得
  const path = request.nextUrl.pathname;

  // 認証不要なパスかチェック
  if (publicPaths.some((publicPath) => path.startsWith(publicPath))) {
    console.log("認証スキップ:", path);
    return NextResponse.next();
  }

  // 管理者専用パスのチェック
  if (request.nextUrl.pathname.startsWith("/api/admin/")) {
    const token = await getToken({ req: request });
    if (!token?.isAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // その他のリクエストは認証必須
  const token = await getToken({ req: request });
  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
}

// ミドルウェアを適用するパスを指定
export const config = {
  matcher: ["/api/:path*", "/home/:path*", "/admin/:path*"],
};
