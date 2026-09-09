import { NextResponse } from "next/server";
import { deviceClient, deviceError } from "@/lib/device";
import { loadRadios, loadSsids } from "@/lib/wireless";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  try {
    const [radios, ssids] = await Promise.all([loadRadios(resolved.client), loadSsids(resolved.client)]);
    return NextResponse.json({ radios, ssids });
  } catch (error) { return deviceError(error); }
}

/** Edits one radio (channel/htmode/txpower) or one SSID (security/hidden/disabled) on this device. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const body = await request.json() as { section?: string; values?: Record<string, unknown> };
  if (!body.section || !body.values) return NextResponse.json({ error: "section and values are required." }, { status: 400 });
  try {
    const { client } = resolved;
    await client.uciSet("wireless", body.section, body.values);
    await client.uciCommit("wireless");
    await client.reloadWifi();
    return NextResponse.json({ ok: true });
  } catch (error) { return deviceError(error); }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const resolved = await deviceClient(params.id);
  if ("error" in resolved) return resolved.error;
  const section = new URL(request.url).searchParams.get("section");
  if (!section) return NextResponse.json({ error: "A section id is required." }, { status: 400 });
  try {
    const { client } = resolved;
    await client.uciDelete("wireless", section);
    await client.uciCommit("wireless");
    await client.reloadWifi();
    return NextResponse.json({ ok: true });
  } catch (error) { return deviceError(error); }
}
