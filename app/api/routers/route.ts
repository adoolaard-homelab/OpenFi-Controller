import { NextResponse } from "next/server";
import { createRouter, getRouters, publicRouter } from "@/lib/router-store";
export const dynamic = "force-dynamic";
const serverError = (error: unknown) => NextResponse.json({ error: error instanceof Error ? `Could not save router: ${error.message}` : "Could not save router." }, { status: 500 });
export async function GET() { try { return NextResponse.json((await getRouters()).map(publicRouter)); } catch (error) { return serverError(error); } }
export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<{ name: string; endpoint: string; username: string; password: string }>;
    if (!body.name || !body.endpoint || !body.username || !body.password) return NextResponse.json({ error: "Name, endpoint, username and password are required." }, { status: 400 });
    let endpoint: URL;
    try { endpoint = new URL(body.endpoint.trim()); } catch { return NextResponse.json({ error: "Enter a valid router endpoint URL, for example https://192.168.1.1/ubus." }, { status: 400 }); }
    if (!/^https?:$/.test(endpoint.protocol)) return NextResponse.json({ error: "Router endpoint must use HTTP or HTTPS." }, { status: 400 });
    const router = await createRouter({ name: body.name.trim(), endpoint: endpoint.toString(), username: body.username.trim(), password: body.password });
    return NextResponse.json(publicRouter(router), { status: 201 });
  } catch (error) { return serverError(error); }
}
