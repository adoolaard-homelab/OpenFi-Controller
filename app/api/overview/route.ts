import { NextResponse } from "next/server";
import { openWrt } from "@/lib/openwrt";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [system, interfaces, clients] = await Promise.all([openWrt.getSystemInfo(), openWrt.getInterfaces(), openWrt.getDhcpClients()]);
    return NextResponse.json({ connected: true, system, interfaces, clients, updatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ connected: false, error: error instanceof Error ? error.message : "Router unavailable" }, { status: 503 });
  }
}
