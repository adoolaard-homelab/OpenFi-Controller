import { NextResponse } from "next/server";
import { ensureMeshWpad } from "@/lib/mesh";
import { OpenWrtClient } from "@/lib/openwrt";
import { getRouters, type RouterRecord } from "@/lib/router-store";
import { loadMeshIfaces, loadRadios, type Band } from "@/lib/wireless";
export const dynamic = "force-dynamic";

async function clientFor(routers: RouterRecord[], routerId: string) {
  const router = routers.find((r) => r.id === routerId);
  return router ? { router, client: new OpenWrtClient(router) } : undefined;
}

/** Aggregated view of 802.11s mesh point interfaces across every adopted device, grouped by mesh_id (one row
 * per mesh network, like SSIDs on the WiFi page), plus the per-radio data the "join mesh" form needs. */
export async function GET() {
  const routers = await getRouters();
  const perRouter = await Promise.all(routers.map(async (router) => {
    const client = new OpenWrtClient(router);
    try {
      const [radios, meshIfaces] = await Promise.all([loadRadios(client), loadMeshIfaces(client)]);
      return { router, radios, meshIfaces, reachable: true as const };
    } catch {
      return { router, radios: [], meshIfaces: [], reachable: false as const };
    }
  }));

  const radios = perRouter.flatMap((entry) => entry.radios.map((radio) => ({ ...radio, routerId: entry.router.id, routerName: entry.router.name })));

  const groups = new Map<string, { meshId: string; network: string; encryption: string; bands: Set<Band>; peers: number; members: { routerId: string; routerName: string; section: string; radioSection: string; band: Band; channel: string; disabled: boolean; up?: boolean; peers: number }[] }>();
  for (const entry of perRouter) for (const iface of entry.meshIfaces) {
    if (!iface.meshId) continue;
    const group = groups.get(iface.meshId) ?? { meshId: iface.meshId, network: iface.network, encryption: iface.encryption, bands: new Set<Band>(), peers: 0, members: [] };
    group.bands.add(iface.band); group.peers += iface.peers;
    group.members.push({ routerId: entry.router.id, routerName: entry.router.name, section: iface.section, radioSection: iface.radioSection, band: iface.band, channel: iface.channel, disabled: iface.disabled, up: iface.up, peers: iface.peers });
    groups.set(iface.meshId, group);
  }
  const meshGroups = [...groups.values()].map((group) => ({
    meshId: group.meshId, network: group.network, security: group.encryption === "sae" ? "WPA3-SAE" : "Open",
    bands: [...group.bands], peers: group.peers, members: group.members,
  }));

  const devices = perRouter.map((entry) => ({ id: entry.router.id, name: entry.router.name, reachable: entry.reachable, radios: entry.radios.map((radio) => ({ section: radio.section, band: radio.band })) }));

  return NextResponse.json({ groups: meshGroups, radios, devices });
}

type MeshTarget = { routerId: string; radioSection: string; channel: string };
type MeshTargetResult = { routerId: string; routerName: string; ok: boolean; note?: string; error?: string };

/** Joins one or more radios (across one or more devices) to a mesh network: aligns each radio to the given
 * channel (802.11s peers must share exactly one channel), optionally swaps in a mesh-capable wpad build, then
 * adds the wifi-iface mesh point and reloads wifi. Every target is attempted independently so a failure on one
 * device doesn't block the others from joining. */
export async function POST(request: Request) {
  const body = await request.json() as { meshId?: string; encryption?: "sae" | "none"; key?: string; autoWpad?: boolean; targets?: MeshTarget[] };
  const meshId = body.meshId?.trim() ?? "";
  if (!meshId) return NextResponse.json({ error: "Mesh ID is required." }, { status: 400 });
  if (!body.targets?.length) return NextResponse.json({ error: "Select at least one radio to join the mesh." }, { status: 400 });
  const encryption = body.encryption === "none" ? "none" : "sae";
  if (encryption === "sae" && (!body.key || body.key.length < 8)) return NextResponse.json({ error: "A mesh password of at least 8 characters is required for WPA3-SAE." }, { status: 400 });
  const autoWpad = body.autoWpad !== false;

  const routers = await getRouters();
  const results: MeshTargetResult[] = await Promise.all(body.targets.map(async (target): Promise<MeshTargetResult> => {
    const resolved = await clientFor(routers, target.routerId);
    if (!resolved) return { routerId: target.routerId, routerName: target.routerId, ok: false, error: "Device not found." };
    const { router, client } = resolved;
    try {
      let note: string | undefined;
      if (autoWpad) {
        const wpad = await ensureMeshWpad(client);
        if (wpad.error) return { routerId: router.id, routerName: router.name, ok: false, error: `wpad: ${wpad.error}` };
        if (wpad.changed) note = `Installed ${wpad.installed} for mesh encryption support.`;
      }
      if (target.channel && target.channel !== "auto") await client.uciSet("wireless", target.radioSection, { channel: target.channel });
      await client.uciAdd("wireless", "wifi-iface", {
        device: target.radioSection, mode: "mesh", network: "lan", mesh_id: meshId,
        encryption, ...(encryption === "sae" ? { key: body.key } : {}), disabled: "0",
      });
      await client.uciCommit("wireless");
      await client.reloadWifi();
      return { routerId: router.id, routerName: router.name, ok: true, note };
    } catch (error) {
      return { routerId: router.id, routerName: router.name, ok: false, error: error instanceof Error ? error.message : "Mesh setup failed." };
    }
  }));
  const ok = results.every((result) => result.ok);
  return NextResponse.json({ ok, results }, { status: ok ? 201 : 207 });
}

export async function PATCH(request: Request) {
  const body = await request.json() as { routerId?: string; section?: string; values?: Record<string, unknown> };
  if (!body.routerId || !body.section || !body.values) return NextResponse.json({ error: "routerId, section and values are required." }, { status: 400 });
  const resolved = await clientFor(await getRouters(), body.routerId);
  if (!resolved) return NextResponse.json({ error: "Device not found." }, { status: 404 });
  try {
    await resolved.client.uciSet("wireless", body.section, body.values);
    await resolved.client.uciCommit("wireless");
    await resolved.client.reloadWifi();
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed." }, { status: 502 }); }
}

export async function DELETE(request: Request) {
  const body = await request.json() as { members?: { routerId: string; section: string }[] };
  if (!body.members?.length) return NextResponse.json({ error: "No mesh members given." }, { status: 400 });
  const routers = await getRouters();
  const byRouter = new Map<string, string[]>();
  for (const member of body.members) byRouter.set(member.routerId, [...(byRouter.get(member.routerId) ?? []), member.section]);
  const errors: string[] = [];
  for (const [routerId, sections] of byRouter) {
    const resolved = await clientFor(routers, routerId);
    if (!resolved) { errors.push(`${routerId}: device not found`); continue; }
    try {
      for (const section of sections) await resolved.client.uciDelete("wireless", section);
      await resolved.client.uciCommit("wireless");
      await resolved.client.reloadWifi();
    } catch (error) { errors.push(`${resolved.router.name}: ${error instanceof Error ? error.message : "failed"}`); }
  }
  if (errors.length) return NextResponse.json({ error: errors.join("; ") }, { status: 502 });
  return NextResponse.json({ ok: true });
}
