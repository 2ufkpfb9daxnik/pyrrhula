import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // チャット以外のGETリクエストは認証不要
  if (
    request.method === "GET" &&
    !request.nextUrl.pathname.startsWith("/api/chat")
  ) {
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
  matcher: "/api/:path*",
};
