"use client";
import Link from "next/link";
import { Cpu, Router, Users, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { NoDevices } from "@/components/device-picker";
import { NotImplemented } from "@/components/not-implemented";

type Lease = { hostname: string; ipaddr: string; macaddr: string };
type Snapshot = {
  routerId: string;
  connected: boolean;
  system?: { uptime: number; load: number[]; memory: { total: number; free: number; available?: number } };
  board?: { model?: string; board_name?: string };
  clients?: Lease[];
};
type RouterItem = { id: string; name: string };
type Overview = { routers: RouterItem[]; snapshots: Snapshot[] };

const uptime = (seconds: number) => { const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600); return d ? `${d}d ${h}h` : `${h}h`; };

export default function Dashboard() {
  const [data, setData] = useState<Overview>();
  useEffect(() => { void fetch("/api/overview").then((r) => r.json()).then(setData).catch(() => setData({ routers: [], snapshots: [] })); }, []);
  const routers = data?.routers ?? [];
  const snapshots = data?.snapshots ?? [];
  const online = snapshots.filter((s) => s.connected);
  const clients = online.flatMap((s) => s.clients ?? []);
  const primary = online.find((s) => s.system);
  const primaryName = primary && routers.find((r) => r.id === primary.routerId)?.name;
  const memoryPct = primary?.system ? Math.round((1 - (primary.system.memory.available ?? primary.system.memory.free) / primary.system.memory.total) * 100) : undefined;

  return (
    <div className="page">
      <p className="eyebrow">Overview</p>
      <h1 className="page-title">Network Dashboard</h1>
      <p className="subtitle">Live data from your adopted OpenWrt devices.</p>

      {!data ? <p className="mt-8 text-sm text-slate-500">Loading devices…</p> : !routers.length ? <div className="mt-8"><NoDevices /></div> : (
        <div className="mt-6 space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            <section className="panel p-5">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">OpenWrt Devices</h2><p className="mt-1 text-xs text-slate-500">Infrastructure status</p></div><Router className="text-blue-600" size={19} /></div>
              <p className="mt-6 text-3xl font-semibold">{routers.length}</p>
              <p className="mt-1 text-xs text-emerald-600">● {online.length} reachable</p>
              <Link href="/routers" className="mt-5 block text-xs font-medium text-blue-600">View all devices →</Link>
            </section>
            <section className="panel p-5">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">Client Devices</h2><p className="mt-1 text-xs text-slate-500">Active DHCP leases</p></div><Users className="text-blue-600" size={19} /></div>
              <p className="mt-6 text-3xl font-semibold">{clients.length}</p>
              <p className="mt-1 text-xs text-slate-500">Reported by {online.length} reachable device{online.length === 1 ? "" : "s"}</p>
              <Link href="/clients" className="mt-5 block text-xs font-medium text-blue-600">View client devices →</Link>
            </section>
            <section className="panel p-5">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">System Resources</h2><p className="mt-1 text-xs text-slate-500">{primaryName ?? "No device reporting yet"}</p></div><Cpu className="text-blue-600" size={19} /></div>
              {primary?.system ? <>
                <p className="mt-6 text-3xl font-semibold">{memoryPct}%</p>
                <p className="mt-1 text-xs text-slate-500">Memory used · load {primary.system.load.join(" · ")} · up {uptime(primary.system.uptime)}</p>
              </> : <p className="mt-6 text-sm text-slate-500">No device has reported system metrics yet.</p>}
              {routers.length > 1 && <Link href="/routers" className="mt-5 block text-xs font-medium text-blue-600">View every device →</Link>}
            </section>
          </div>

          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 p-5"><div><h2 className="font-semibold">Client overview</h2><p className="mt-1 text-xs text-slate-500">Current DHCP leases</p></div><Wifi className="text-blue-600" size={19} /></div>
            {clients.length ? <div>{clients.map((client) => (
              <div key={client.macaddr} className="flex items-center justify-between border-t border-slate-200 p-4 first:border-t-0">
                <div><p className="font-medium">{client.hostname || client.macaddr}</p><p className="mt-0.5 text-xs text-slate-500">{client.ipaddr}</p></div>
                <span className="status-pill"><i />Online</span>
              </div>
            ))}</div> : <p className="p-8 text-sm text-slate-500">No clients reported yet.</p>}
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <NotImplemented title="Internet Activity" description="WAN download/upload throughput history. Requires collecting traffic counters over ubus, which is not implemented yet." />
            <NotImplemented title="Network Health" description="Automated detection of WAN outages, high channel utilization and client issues. Not implemented yet." />
          </div>
        </div>
      )}
    </div>
  );
}
