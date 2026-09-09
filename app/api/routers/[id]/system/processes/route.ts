import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

/** Parses busybox `ps w` output ("PID USER VSZ STAT COMMAND...") into rows. Column layout is whitespace-separated, command may contain spaces. */
function parsePs(stdout: string) {
  const lines = stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  const [, ...rows] = lines;
  return rows.map((line) => {
    const parts = line.split(/\s+/);
    const [pid, user, vsz, stat, ...rest] = parts;
    return { pid, user, vsz, stat, command: rest.join(" ") || stat };
  }).filter((row) => row.pid);
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  try {
    const result = await resolved.client.listProcesses();
    return NextResponse.json({ processes: parsePs(result.stdout) });
  } catch (error) { return deviceError(error); }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const pid = new URL(request.url).searchParams.get("pid");
  if (!pid || !/^\d+$/.test(pid)) return NextResponse.json({ error: "A numeric pid is required." }, { status: 400 });
  try { await resolved.client.killProcess(pid); return NextResponse.json({ ok: true }); }
  catch (error) { return deviceError(error); }
}
