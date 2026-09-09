import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

/** Inbound NAT / port-forwarding rules (uci firewall "redirect" sections). Zone-based firewall editing is a
 * separate, much larger subsystem and is intentionally not covered here (see the Security settings page). */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  try {
    const firewall = await resolved.client.uciGetAll("firewall");
    const forwards = Object.values(firewall).filter((section) => section[".type"] === "redirect").map((section) => ({
      id: section[".name"], name: (section.name as string) ?? "", proto: (section.proto as string) ?? "tcp",
      src: (section.src as string) ?? "wan", srcDPort: (section.src_dport as string) ?? "", destIp: (section.dest_ip as string) ?? "",
      destPort: (section.dest_port as string) ?? "", enabled: section.enabled !== "0",
    }));
    return NextResponse.json({ forwards });
  } catch (error) { return deviceError(error); }
}

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const PORT = /^\d{1,5}(-\d{1,5})?$/;
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const body = await request.json() as { name?: string; proto?: string; srcDPort?: string; destIp?: string; destPort?: string };
  if (!PORT.test(body.srcDPort ?? "") || !PORT.test(body.destPort ?? "")) return NextResponse.json({ error: "Enter valid port numbers." }, { status: 400 });
  if (!IPV4.test(body.destIp ?? "")) return NextResponse.json({ error: "Enter a valid destination IPv4 address." }, { status: 400 });
  try {
    const { client } = resolved;
    await client.uciAdd("firewall", "redirect", {
      name: body.name?.trim() || "OpenFi forward", target: "DNAT", src: "wan", proto: body.proto ?? "tcp",
      src_dport: body.srcDPort, dest: "lan", dest_ip: body.destIp, dest_port: body.destPort, enabled: "1",
    });
    await client.uciCommit("firewall");
    await client.reloadFirewall();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return deviceError(error); }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A rule id is required." }, { status: 400 });
  try {
    const { client } = resolved;
    await client.uciDelete("firewall", id);
    await client.uciCommit("firewall");
    await client.reloadFirewall();
    return NextResponse.json({ ok: true });
  } catch (error) { return deviceError(error); }
}
