import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

const PKG_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._+-]*$/;

/** opkg list / list-installed / find all print "name - version[ - description]" lines. */
function parseOpkgLines(stdout: string) {
  return stdout.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name, version, ...rest] = line.split(" - ");
    return { name, version: version ?? "", description: rest.join(" - ") };
  }).filter((pkg) => pkg.name);
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const query = new URL(request.url).searchParams.get("q")?.trim();
  try {
    const result = query ? await resolved.client.opkgFind(query) : await resolved.client.opkgListInstalled();
    return NextResponse.json({ packages: parseOpkgLines(result.stdout), searched: Boolean(query) });
  } catch (error) { return deviceError(error); }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const body = await request.json() as { pkg?: string };
  if (!body.pkg || !PKG_NAME.test(body.pkg)) return NextResponse.json({ error: "Enter a valid package name." }, { status: 400 });
  try {
    const result = await resolved.client.opkgInstall(body.pkg);
    if (result.code !== 0) return NextResponse.json({ error: result.stderr || result.stdout || "opkg install failed." }, { status: 502 });
    return NextResponse.json({ ok: true, output: result.stdout });
  } catch (error) { return deviceError(error); }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const pkg = new URL(request.url).searchParams.get("pkg");
  if (!pkg || !PKG_NAME.test(pkg)) return NextResponse.json({ error: "Enter a valid package name." }, { status: 400 });
  try {
    const result = await resolved.client.opkgRemove(pkg);
    if (result.code !== 0) return NextResponse.json({ error: result.stderr || result.stdout || "opkg remove failed." }, { status: 502 });
    return NextResponse.json({ ok: true, output: result.stdout });
  } catch (error) { return deviceError(error); }
}
