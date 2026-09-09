"use client";
import { useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";
import { NotImplementedSection } from "@/components/not-implemented";

export default function FirewallSettingsPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  if (!routers) return <p className="mt-8 text-sm text-slate-500">Loading devices…</p>;
  if (!routers.length) return <div className="mt-8"><NoDevices /></div>;
  return (
    <div className="mt-8 space-y-8">
      <DevicePicker routers={routers} value={selected} onChange={setSelected} />
      <NotImplementedSection title="Zones" items={[
        { title: "Zone-based firewall", description: "WAN / LAN / Guest zones and forwarding policy." },
      ]} />
      <NotImplementedSection title="Rules" items={[
        { title: "Port forwarding", description: "Inbound NAT / port redirection rules." },
        { title: "Traffic rules", description: "Inbound and outbound allow/block rules and IP filtering." },
      ]} />
    </div>
  );
}
