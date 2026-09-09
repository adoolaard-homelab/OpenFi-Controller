import { NextResponse } from "next/server";
import { OpenWrtClient } from "@/lib/openwrt";
import { getRouters, type RouterRecord } from "@/lib/router-store";
import { loadRadios, loadSsids, nextWifinetName, securityLabel, type Band } from "@/lib/wireless";
export const dynamic = "force-dynamic";

async function clientFor(routerId: string): Promise<{ router: RouterRecord; client: OpenWrtClient } | undefined> {
  const router = (await getRouters()).find((r) => r.id === routerId);
  return router ? { router, client: new OpenWrtClient(router) } : undefined;
}

/** Aggregated, UniFi-style view of wireless config across every adopted device: per-radio channel data for the
 * channelization grid, and SSIDs grouped by name so one broadcast network shows as a single row. */
export async function GET() {
  const routers = await getRouters();
  const perRouter = await Promise.all(routers.map(async (router) => {
    const client = new OpenWrtClient(router);
    try {
      const [radios, ssids] = await Promise.all([loadRadios(client), loadSsids(client)]);
      return { router, radios, ssids, reachable: true as const };
    } catch {
      return { router, radios: [], ssids: [], reachable: false as const };
    }
  }));

  const radios = perRouter.flatMap((entry) => entry.radios.map((radio) => ({ ...radio, routerId: entry.router.id, routerName: entry.router.name })));

  const groups = new Map<string, { name: string; network: string; encryption: string; bands: Set<Band>; clients: number; members: { routerId: string; routerName: string; section: string; radioSection: string; band: Band; disabled: boolean }[] }>();
  for (const entry of perRouter) for (const ssid of entry.ssids) {
    if (!ssid.ssid) continue;
    const group = groups.get(ssid.ssid) ?? { name: ssid.ssid, network: ssid.network, encryption: ssid.encryption, bands: new Set<Band>(), clients: 0, members: [] };
    group.bands.add(ssid.band); group.clients += ssid.clients;
    group.members.push({ routerId: entry.router.id, routerName: entry.router.name, section: ssid.section, radioSection: ssid.radioSection, band: ssid.band, disabled: ssid.disabled });
    groups.set(ssid.ssid, group);
  }
  const ssidGroups = [...groups.values()].map((group) => ({
    name: group.name, network: group.network, security: securityLabel(group.encryption),
    bands: [...group.bands], broadcastingAPs: new Set(group.members.map((m) => m.routerId)).size,
    clients: group.clients, members: group.members,
  }));

  const devices = perRouter.map((entry) => ({ id: entry.router.id, name: entry.router.name, reachable: entry.reachable, radios: entry.radios.map((radio) => ({ section: radio.section, band: radio.band })) }));

  return NextResponse.json({ radios, ssidGroups, devices });
}

type CreateTarget = { routerId: string; radioSection: string };
export async function POST(request: Request) {
  const body = await request.json() as { ssid?: string; network?: string; encryption?: string; key?: string; hidden?: boolean; isolate?: boolean; targets?: CreateTarget[] };
  const ssid = body.ssid?.trim() ?? "";
  if (!ssid) return NextResponse.json({ error: "SSID name is required." }, { status: 400 });
  if (!body.targets?.length) return NextResponse.json({ error: "Select at least one access point radio to broadcast on." }, { status: 400 });
  const encryption = body.encryption ?? "psk2";
  if (encryption !== "none" && (!body.key || body.key.length < 8)) return NextResponse.json({ error: "A WiFi password of at least 8 characters is required." }, { status: 400 });

  const errors: string[] = [];
  // Targets are applied one at a time (not in parallel) so that, when two targets share a router (e.g. its
  // 2.4GHz and 5GHz radios), each wifinet<N> name is computed after the previous section on that router exists.
  for (const target of body.targets) {
    const resolved = await clientFor(target.routerId);
    if (!resolved) { errors.push(`${target.routerId}: device not found`); continue; }
    try {
      const { client } = resolved;
      const name = nextWifinetName(await client.getWirelessConfig());
      await client.uciAdd("wireless", "wifi-iface", {
        device: target.radioSection, network: body.network ?? "lan", mode: "ap", ssid,
        encryption, ...(encryption !== "none" ? { key: body.key } : {}), hidden: body.hidden ? "1" : "0",
        isolate: body.isolate ? "1" : "0", disabled: "0",
      }, name);
      await client.uciCommit("wireless");
      await client.reloadWifi();
    } catch (error) { errors.push(`${resolved.router.name}: ${error instanceof Error ? error.message : "failed"}`); }
  }
  if (errors.length) return NextResponse.json({ error: errors.join("; ") }, { status: 502 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json() as { routerId?: string; section?: string; values?: Record<string, unknown> };
  if (!body.routerId || !body.section || !body.values) return NextResponse.json({ error: "routerId, section and values are required." }, { status: 400 });
  const resolved = await clientFor(body.routerId);
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
  if (!body.members?.length) return NextResponse.json({ error: "No SSID members given." }, { status: 400 });
  const byRouter = new Map<string, string[]>();
  for (const member of body.members) byRouter.set(member.routerId, [...(byRouter.get(member.routerId) ?? []), member.section]);
  const errors: string[] = [];
  for (const [routerId, sections] of byRouter) {
    const resolved = await clientFor(routerId);
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
