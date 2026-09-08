import { NextResponse } from "next/server";
import { createRouter, getRouters, publicRouter } from "@/lib/router-store";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json((await getRouters()).map(publicRouter)); }
export async function POST(request: Request) {
  const body = await request.json() as Partial<{ name: string; endpoint: string; username: string; password: string }>;
  if (!body.name || !body.endpoint || !body.username || !body.password) return NextResponse.json({ error: "Name, endpoint, username and password are required." }, { status: 400 });
  try { new URL(body.endpoint); } catch { return NextResponse.json({ error: "Enter a valid router endpoint URL." }, { status: 400 }); }
  const router = await createRouter({ name: body.name.trim(), endpoint: body.endpoint.trim(), username: body.username.trim(), password: body.password });
  return NextResponse.json(publicRouter(router), { status: 201 });
}
