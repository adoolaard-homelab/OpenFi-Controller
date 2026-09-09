"use client";
import { useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";
import { NotImplementedSection } from "@/components/not-implemented";
import { LogsCard, ProcessesCard } from "@/components/system-settings";

export default function InsightsPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  return (
    <div className="page">
      <p className="eyebrow">Analytics</p>
      <h1 className="page-title">Insights</h1>
      <p className="subtitle">Routing, firewall and system diagnostics per device.</p>
      {!routers ? <p className="mt-8 text-sm text-slate-500">Loading devices…</p> : !routers.length ? <div className="mt-8"><NoDevices /></div> : (
        <div className="mt-8 space-y-8">
          <DevicePicker routers={routers} value={selected} onChange={setSelected} />
          {selected && <>
            <LogsCard deviceId={selected} />
            <ProcessesCard deviceId={selected} />
          </>}
          <NotImplementedSection title="Routing" items={[
            { title: "IPv4 / IPv6 routing table", description: "Live routing table entries for this device." },
            { title: "ARP / neighbor table", description: "Reachable hosts on directly connected networks." },
          ]} />
          <NotImplementedSection title="Firewall" items={[
            { title: "Traffic statistics", description: "Per-zone packet and byte counters." },
            { title: "Active connections", description: "Live NAT/conntrack session table." },
          ]} />
        </div>
      )}
    </div>
  );
}
