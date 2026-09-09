import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

/** Unauthenticated on purpose — Docker's healthcheck hits this, and must not be redirected to /login. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
