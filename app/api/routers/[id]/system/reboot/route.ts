import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  try { await resolved.client.reboot(); return NextResponse.json({ ok: true }); }
  catch (error) { return deviceError(error); }
}
