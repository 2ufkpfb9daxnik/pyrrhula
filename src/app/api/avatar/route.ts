import { NextResponse } from "next/server";

const CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

function isDisallowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }

  if (
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return true;
  }

  return false;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get("url");

    if (!rawUrl) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }

    if (!(target.protocol === "https:" || target.protocol === "http:")) {
      return NextResponse.json(
        { error: "unsupported protocol" },
        { status: 400 },
      );
    }

    if (isDisallowedHost(target.hostname)) {
      return NextResponse.json({ error: "disallowed host" }, { status: 403 });
    }

    const upstream = await fetch(target.toString(), {
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "failed to fetch avatar" },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/svg+xml";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": CACHE_CONTROL,
        "x-avatar-proxy": "1",
      },
    });
  } catch (error) {
    console.error("[avatar proxy error]", error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 },
    );
  }
}
