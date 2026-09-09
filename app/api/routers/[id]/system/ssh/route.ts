import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  try {
    const section = await resolved.client.uciFindByType("dropbear", "dropbear");
    return NextResponse.json({
      enabled: section ? section.enable !== "0" : true,
      port: Number(section?.Port ?? 22),
      passwordAuth: section?.PasswordAuth !== "off",
      rootPasswordAuth: section?.RootPasswordAuth !== "off",
      lanOnly: section?.Interface === "lan",
    });
  } catch (error) { return deviceError(error); }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const body = await request.json() as Partial<{ enabled: boolean; port: number; passwordAuth: boolean; rootPasswordAuth: boolean; lanOnly: boolean }>;
  try {
    const { client } = resolved;
    let section = await client.uciFindByType("dropbear", "dropbear");
    const values: Record<string, unknown> = {};
    if (body.enabled !== undefined) values.enable = body.enabled ? "1" : "0";
    if (body.port !== undefined) values.Port = String(body.port);
    if (body.passwordAuth !== undefined) values.PasswordAuth = body.passwordAuth ? "on" : "off";
    if (body.rootPasswordAuth !== undefined) values.RootPasswordAuth = body.rootPasswordAuth ? "on" : "off";
    if (body.lanOnly !== undefined) values.Interface = body.lanOnly ? "lan" : "";
    if (section) await client.uciSet("dropbear", section[".name"], values);
    else await client.uciAdd("dropbear", "dropbear", values, "dropbear_openfi");
    await client.uciCommit("dropbear");
    await client.reloadDropbear();
    return NextResponse.json({ ok: true });
  } catch (error) { return deviceError(error); }
}
