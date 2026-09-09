import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

const MAC = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  try {
    const [leases, dhcp] = await Promise.all([resolved.client.getDhcpClients(), resolved.client.uciGetAll("dhcp")]);
    const staticLeases = Object.values(dhcp).filter((section) => section[".type"] === "host").map((section) => ({
      id: section[".name"], name: (section.name as string) ?? "", mac: (section.mac as string) ?? "", ip: (section.ip as string) ?? "",
    }));
    return NextResponse.json({ leases, staticLeases });
  } catch (error) { return deviceError(error); }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const body = await request.json() as { name?: string; mac?: string; ip?: string };
  const mac = body.mac?.trim().toUpperCase() ?? "", ip = body.ip?.trim() ?? "", name = body.name?.trim() ?? "";
  if (!MAC.test(mac)) return NextResponse.json({ error: "Enter a valid MAC address." }, { status: 400 });
  if (!IPV4.test(ip)) return NextResponse.json({ error: "Enter a valid IPv4 address." }, { status: 400 });
  try {
    const { client } = resolved;
    await client.uciAdd("dhcp", "host", { name: name || undefined, mac, ip });
    await client.uciCommit("dhcp");
    await client.reloadDnsmasq();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return deviceError(error); }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A lease id is required." }, { status: 400 });
  try {
    const { client } = resolved;
    await client.uciDelete("dhcp", id);
    await client.uciCommit("dhcp");
    await client.reloadDnsmasq();
    return NextResponse.json({ ok: true });
  } catch (error) { return deviceError(error); }
}
