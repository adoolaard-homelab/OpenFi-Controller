import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  try {
    const network = await resolved.client.uciGetAll("network");
    const routes = Object.values(network).filter((section) => section[".type"] === "route").map((section) => ({
      id: section[".name"], target: (section.target as string) ?? "", netmask: (section.netmask as string) ?? "255.255.255.255",
      gateway: (section.gateway as string) ?? "", interface: (section.interface as string) ?? "lan",
    }));
    return NextResponse.json({ routes });
  } catch (error) { return deviceError(error); }
}

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const body = await request.json() as { target?: string; netmask?: string; gateway?: string; interface?: string };
  if (!IPV4.test(body.target ?? "") || !IPV4.test(body.gateway ?? "")) return NextResponse.json({ error: "Enter valid IPv4 addresses." }, { status: 400 });
  try {
    const { client } = resolved;
    await client.uciAdd("network", "route", { target: body.target, netmask: body.netmask ?? "255.255.255.255", gateway: body.gateway, interface: body.interface ?? "lan" });
    await client.uciCommit("network");
    await client.reloadNetwork();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return deviceError(error); }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A route id is required." }, { status: 400 });
  try {
    const { client } = resolved;
    await client.uciDelete("network", id);
    await client.uciCommit("network");
    await client.reloadNetwork();
    return NextResponse.json({ ok: true });
  } catch (error) { return deviceError(error); }
}
