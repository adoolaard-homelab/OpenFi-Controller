import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const url = new URL(request.url);
  const kernel = url.searchParams.get("source") === "kernel";
  const lines = Math.min(Number(url.searchParams.get("lines") ?? 200) || 200, 1000);
  try {
    if (kernel) return NextResponse.json({ lines: (await resolved.client.readKernelLog()).split("\n").filter(Boolean) });
    const entries = await resolved.client.readLog(lines);
    return NextResponse.json({ lines: entries.map((entry) => entry.msg) });
  } catch (error) { return deviceError(error); }
}
