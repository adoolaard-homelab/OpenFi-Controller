import { NextResponse } from "next/server";
import { pollRouters } from "@/lib/polling-service";
import { getRouters, publicRouter } from "@/lib/router-store";
export const dynamic = "force-dynamic";
export async function GET() {
  const routers = await getRouters();
  const snapshots = await pollRouters(routers);
  return NextResponse.json({ routers: routers.map(publicRouter), snapshots, updatedAt: new Date().toISOString() });
}
