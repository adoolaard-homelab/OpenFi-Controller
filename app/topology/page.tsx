"use client";
import { Globe, Laptop, Router, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { NoDevices } from "@/components/device-picker";
import { NotImplemented } from "@/components/not-implemented";

type Lease = { hostname: string; ipaddr: string; macaddr: string };
type Snapshot = { routerId: string; connected: boolean; clients?: Lease[] };
type RouterItem = { id: string; name: string };
type Overview = { routers: RouterItem[]; snapshots: Snapshot[] };

export default function TopologyPage() {
  const [data, setData] = useState<Overview>();
  useEffect(() => { void fetch("/api/overview").then((r) => r.json()).then(setData).catch(() => setData({ routers: [], snapshots: [] })); }, []);
  const routers = data?.routers ?? [];
  return (
    <div className="page">
      <p className="eyebrow">Network map</p>
      <h1 className="page-title">Topology</h1>
      <p className="subtitle">Built from adopted devices and their reported DHCP clients.</p>
      {!data ? <p className="mt-8 text-sm text-slate-500">Loading topology…</p> : !routers.length ? <div className="mt-8"><NoDevices /></div> : (
        <div className="mt-8 space-y-6">
          <div className="flex justify-center"><span className="detail-card flex items-center gap-2 !w-fit"><Globe size={16} className="text-blue-600" />Internet</span></div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {routers.map((router) => {
              const snapshot = data.snapshots.find((s) => s.routerId === router.id);
              return (
                <section key={router.id} className="panel p-5">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-400/10 text-sky-400"><Router size={19} /></span>
                    <div>
                      <p className="font-medium">{router.name}</p>
                      <p className={`mt-0.5 text-xs ${snapshot?.connected ? "text-emerald-600" : "text-slate-500"}`}>{snapshot ? (snapshot.connected ? "Online" : "Offline") : "Awaiting poll"}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {snapshot?.clients?.length ? snapshot.clients.map((client) => (
                      <div key={client.macaddr} className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <Wifi size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate text-slate-700">{client.hostname || client.macaddr}</span>
                        <span className="ml-auto shrink-0 text-xs text-slate-500">{client.ipaddr}</span>
                      </div>
                    )) : <p className="px-1 py-2 text-sm text-slate-500">No clients reported.</p>}
                  </div>
                </section>
              );
            })}
          </div>
          <NotImplemented
            title="Multi-hop topology"
            description="Uplink discovery between adopted devices (LLDP, bridge tables, wireless mesh/uplink associations) is not implemented yet — every device is currently shown as a direct child of the Internet node instead of its real position in the network."
          />
        </div>
      )}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Laptop size={12} />Client icons represent DHCP leases, not confirmed live wireless/wired links.</div>
    </div>
  );
}
