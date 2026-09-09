import { NextResponse } from "next/server";
import { createSessionToken, isAuthConfigured, isRateLimited, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, verifyPassword } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthConfigured()) return NextResponse.json({ error: "OPENFI_PASSWORD is not configured on the controller." }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyPassword(password)) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
