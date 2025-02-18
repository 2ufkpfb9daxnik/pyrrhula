import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // 公開APIパス（ログイン不要）
  const publicPaths = [
    "/api/posts",
    "/api/users",
    "/api/search",
    "/api/auth/login",
    "/api/auth/signup",
  ];

  // GETメソッドの場合は基本的に許可
  if (
    request.method === "GET" &&
    !request.nextUrl.pathname.startsWith("/api/chat")
  ) {
    return NextResponse.next();
  }

  // 管理者専用パスのチェック
  if (request.nextUrl.pathname.startsWith("/api/admin/")) {
    // 管理者権限チェック
    const isAdmin = await checkAdminPermission(request);
    if (!isAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // その他のパスは認証必須
  const session = await getServerSession(request);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
}
