import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

/** Hostnames/IPs only — the target is always passed as a single argv element to file.exec, never through a shell. */
const TARGET = /^[a-zA-Z0-9.:_-]{1,253}$/;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const body = await request.json() as { type?: "ping" | "traceroute" | "nslookup"; target?: string };
  const target = body.target?.trim() ?? "";
  if (!TARGET.test(target)) return NextResponse.json({ error: "Enter a valid hostname or IP address." }, { status: 400 });
  try {
    const result = body.type === "traceroute" ? await resolved.client.traceroute(target)
      : body.type === "nslookup" ? await resolved.client.nslookup(target)
      : body.type === "ping" ? await resolved.client.ping(target)
      : undefined;
    if (!result) return NextResponse.json({ error: "Unknown diagnostic type." }, { status: 400 });
    return NextResponse.json({ code: result.code, output: [result.stdout, result.stderr].filter(Boolean).join("\n") });
  } catch (error) { return deviceError(error); }
}
