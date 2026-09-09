import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const body = await request.json() as { password?: string };
  if (!body.password || body.password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  try {
    await resolved.client.setPassword("root", body.password);
    return NextResponse.json({ ok: true });
  } catch (error) { return deviceError(error); }
}
