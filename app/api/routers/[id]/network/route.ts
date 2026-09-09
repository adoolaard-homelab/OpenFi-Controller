import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  try {
    const { client } = resolved;
    const [lan, wan, live] = await Promise.all([
      client.uciGetSection("network", "lan").catch(() => undefined),
      client.uciGetSection("network", "wan").catch(() => undefined),
      client.getInterfaces().catch(() => []),
    ]);
    return NextResponse.json({
      lan: lan ? { proto: lan.proto ?? "static", ipaddr: lan.ipaddr ?? "", netmask: lan.netmask ?? "255.255.255.0" } : undefined,
      wan: wan ? { proto: wan.proto ?? "dhcp", ipaddr: wan.ipaddr ?? "", netmask: wan.netmask ?? "", gateway: wan.gateway ?? "", username: wan.username ?? "" } : undefined,
      live: live.filter((iface) => iface.interface === "lan" || iface.interface === "wan"),
    });
  } catch (error) { return deviceError(error); }
}

const ALLOWED_PROTO = new Set(["static", "dhcp", "pppoe"]);
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const body = await request.json() as { target?: "lan" | "wan"; values?: Record<string, unknown> };
  if (body.target !== "lan" && body.target !== "wan") return NextResponse.json({ error: "target must be lan or wan." }, { status: 400 });
  if (!body.values) return NextResponse.json({ error: "values are required." }, { status: 400 });
  if (body.values.proto !== undefined && !ALLOWED_PROTO.has(String(body.values.proto))) return NextResponse.json({ error: "Unsupported protocol." }, { status: 400 });
  try {
    const { client } = resolved;
    await client.uciSet("network", body.target, body.values);
    await client.uciCommit("network");
    await client.reloadNetwork();
    return NextResponse.json({ ok: true });
  } catch (error) { return deviceError(error); }
}
