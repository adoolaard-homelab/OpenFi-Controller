import { OpenWrtClient } from "@/lib/openwrt";
import type { RouterRecord } from "@/lib/router-store";

export type RouterSnapshot = { routerId: string; connected: boolean; updatedAt: string; system?: Awaited<ReturnType<OpenWrtClient["getSystemInfo"]>>; clients?: Awaited<ReturnType<OpenWrtClient["getDhcpClients"]>>; error?: string };
/** Poll routers concurrently. Invoke from a scheduled worker; API requests should read persisted snapshots. */
export async function pollRouters(routers: RouterRecord[]): Promise<RouterSnapshot[]> {
  return Promise.all(routers.map(async (router) => {
    const client = new OpenWrtClient(router);
    try { const [system, clients] = await Promise.all([client.getSystemInfo(), client.getDhcpClients()]); return { routerId: router.id, connected: true, system, clients, updatedAt: new Date().toISOString() }; }
    catch (error) { return { routerId: router.id, connected: false, error: error instanceof Error ? error.message : "Router unavailable", updatedAt: new Date().toISOString() }; }
  }));
}
