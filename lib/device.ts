import { NextResponse } from "next/server";
import { OpenWrtClient } from "@/lib/openwrt";
import { getRouters } from "@/lib/router-store";

/** Resolves the ubus client for one adopted device by id, or a 404 response if it isn't adopted. */
export async function deviceClient(id: string): Promise<{ client: OpenWrtClient } | { error: NextResponse }> {
  const router = (await getRouters()).find((r) => r.id === id);
  if (!router) return { error: NextResponse.json({ error: "Device not found." }, { status: 404 }) };
  return { client: new OpenWrtClient(router) };
}

export function deviceError(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Device request failed." }, { status: 502 });
}
