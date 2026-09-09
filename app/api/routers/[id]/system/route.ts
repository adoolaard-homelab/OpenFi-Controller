import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
export const dynamic = "force-dynamic";

type SystemPatch = Partial<{ hostname: string; timezone: string; zonename: string; ntpEnabled: boolean; ntpServers: string[] }>;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  try {
    const [system, ntp] = await Promise.all([
      resolved.client.uciFindByType("system", "system"),
      resolved.client.uciFindByType("system", "timeserver"),
    ]);
    return NextResponse.json({
      hostname: system?.hostname ?? "", timezone: system?.timezone ?? "UTC", zonename: system?.zonename ?? "UTC",
      ntp: { enabled: ntp ? ntp.enabled !== "0" : true, servers: (ntp?.server as string[] | undefined) ?? [] },
    });
  } catch (error) { return deviceError(error); }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const body = await request.json() as SystemPatch;
  try {
    const { client } = resolved;
    let touchedSystem = false, touchedNtp = false;
    if (body.hostname !== undefined || body.timezone !== undefined || body.zonename !== undefined) {
      const system = await client.uciFindByType("system", "system");
      const values: Record<string, unknown> = {};
      if (body.hostname !== undefined) values.hostname = body.hostname.trim();
      if (body.timezone !== undefined) values.timezone = body.timezone;
      if (body.zonename !== undefined) values.zonename = body.zonename;
      if (system) await client.uciSet("system", system[".name"], values);
      else await client.uciAdd("system", "system", values, "system_openfi");
      touchedSystem = true;
    }
    if (body.ntpEnabled !== undefined || body.ntpServers !== undefined) {
      const ntp = await client.uciFindByType("system", "timeserver");
      const values: Record<string, unknown> = {};
      if (body.ntpEnabled !== undefined) values.enabled = body.ntpEnabled ? "1" : "0";
      if (body.ntpServers !== undefined) values.server = body.ntpServers.filter(Boolean);
      if (ntp) await client.uciSet("system", ntp[".name"], values);
      else await client.uciAdd("system", "timeserver", values, "ntp");
      touchedNtp = true;
    }
    if (touchedSystem || touchedNtp) {
      await client.uciCommit("system");
      await client.exec(["/etc/init.d/system"], ["reload"]).catch(() => undefined);
      if (touchedNtp) await client.exec(["/etc/init.d/sysntpd"], ["restart"]).catch(() => undefined);
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return deviceError(error); }
}
