"use client";
import { X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { DiagnosticsCard } from "@/components/diagnostics-card";
import { NotImplemented, NotImplementedSection } from "@/components/not-implemented";
import { LogsCard, OpkgCard, ProcessesCard, RebootCard } from "@/components/system-settings";

type Snapshot = {
  connected: boolean;
  system?: { uptime: number; load: number[]; memory: { total: number; free: number; available?: number } };
  board?: { hostname: string; model?: string; board_name?: string; release?: { distribution?: string; version?: string; revision?: string; target?: string; description?: string } };
  clients?: unknown[];
};

const uptime = (seconds: number) => { const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60); return d ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`; };

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-slate-700">{value}</p></div>;
}

export function DeviceDrawer({ id, name, endpoint, snapshot, close }: { id: string; name: string; endpoint: string; snapshot?: Snapshot; close: () => void }) {
  const [tab, setTab] = useState("Overview");
  const memoryPct = snapshot?.system ? Math.round((1 - (snapshot.system.memory.available ?? snapshot.system.memory.free) / snapshot.system.memory.total) * 100) : undefined;
  return (
    <div className="drawer-backdrop">
      <aside className="drawer flex flex-col">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="font-semibold">{name}</h2>
            <p className="mt-1 text-sm text-slate-500">{snapshot?.board?.model ?? snapshot?.board?.board_name ?? endpoint}</p>
          </div>
          <button aria-label="Close device details" className="text-slate-500 hover:text-slate-900" onClick={close}><X /></button>
        </div>
        <div className="flex border-b border-slate-200 px-6">
          {["Overview", "Insights", "Settings", "Tools"].map((name) => (
            <button key={name} onClick={() => setTab(name)} className={`mr-7 border-b-2 py-4 text-sm ${tab === name ? "border-sky-400 text-slate-900" : "border-transparent text-slate-500"}`}>{name}</button>
          ))}
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {tab === "Overview" && <>
            <section><p className="section-label">Connection status</p><div className="detail-card"><p className={`font-medium ${snapshot?.connected ? "text-emerald-400" : "text-slate-400"}`}>● {snapshot ? (snapshot.connected ? "Connected" : "Unavailable") : "Awaiting poll"}</p><p className="mt-1 text-sm text-slate-500">uBus endpoint: <b className="text-slate-700">{endpoint}</b></p></div></section>
            <section><p className="section-label">Device</p><div className="detail-card grid grid-cols-2 gap-y-4 text-sm">
              <Info label="Model" value={snapshot?.board?.model ?? snapshot?.board?.board_name ?? "Not reported"} />
              <Info label="Hostname" value={snapshot?.board?.hostname ?? "Not reported"} />
              <Info label="Firmware" value={snapshot?.board?.release?.description ?? "Not reported"} />
              <Info label="Target" value={snapshot?.board?.release?.target ?? "Not reported"} />
            </div></section>
            <section><p className="section-label">System</p>{snapshot?.system ? <div className="detail-card grid grid-cols-2 gap-y-4 text-sm">
              <Info label="Uptime" value={uptime(snapshot.system.uptime)} />
              <Info label="Load average" value={snapshot.system.load.join(" · ")} />
              <Info label="Memory used" value={`${memoryPct}%`} />
              <Info label="Adopted clients" value={String(snapshot.clients?.length ?? 0)} />
            </div> : <p className="detail-card text-sm text-slate-500">No system metrics reported yet.</p>}</section>
          </>}
          {tab === "Insights" && <div className="space-y-6">
            <LogsCard deviceId={id} />
            <ProcessesCard deviceId={id} />
            <NotImplementedSection title="Analytics" items={[
              { title: "Realtime bandwidth graphs", description: "Live Tx/Rx throughput per interface." },
              { title: "Routing table", description: "IPv4/IPv6 routes and ARP/neighbor entries." },
              { title: "Firewall & conntrack", description: "Traffic counters and active NAT sessions per zone." },
            ]} />
          </div>}
          {tab === "Settings" && <div className="space-y-4">
            <p className="text-sm text-slate-500">Full System, WiFi, Networks and Security settings for this device live under <Link className="text-sky-400" href="/settings/system">Settings</Link>. Software packages can be managed below.</p>
            <OpkgCard deviceId={id} />
            <NotImplementedSection title="Device settings" items={[
              { title: "Startup & scheduled tasks", description: "init.d startup scripts and cron jobs." },
              { title: "LED configuration", description: "Assign triggers to the device's physical LEDs." },
            ]} />
          </div>}
          {tab === "Tools" && <div className="space-y-6">
            <DiagnosticsCard deviceId={id} />
            <RebootCard deviceId={id} />
            <NotImplementedSection title="Tools" items={[
              { title: "Backup & restore", description: "Download or restore a configuration archive." },
              { title: "Firmware update", description: "Attended sysupgrade or manual image flash." },
            ]} />
          </div>}
        </div>
      </aside>
    </div>
  );
}
