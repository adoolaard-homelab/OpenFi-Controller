import { NextResponse, type NextRequest } from "next/server";
import { isAuthConfigured, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/logout", "/api/health"]);

const SETUP_REQUIRED_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>OpenFi Controller — setup required</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:grid;min-height:100vh;place-items:center;margin:0}
main{max-width:32rem;padding:2rem;text-align:center}code{background:#1e293b;padding:.2rem .45rem;border-radius:.35rem}</style></head>
<body><main><h1>Setup required</h1><p>Set the <code>OPENFI_PASSWORD</code> environment variable on the controller and restart it before the UI becomes available.</p></main></body></html>`;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  if (!isAuthConfigured()) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "OPENFI_PASSWORD is not configured on the controller." }, { status: 503 });
    return new NextResponse(SETUP_REQUIRED_HTML, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
