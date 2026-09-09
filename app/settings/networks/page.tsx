"use client";
import { useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";
import { NotImplementedSection } from "@/components/not-implemented";

export default function NetworksSettingsPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  if (!routers) return <p className="mt-8 text-sm text-slate-500">Loading devices…</p>;
  if (!routers.length) return <div className="mt-8"><NoDevices /></div>;
  return (
    <div className="mt-8 space-y-8">
      <DevicePicker routers={routers} value={selected} onChange={setSelected} />
      <NotImplementedSection title="Interfaces" items={[
        { title: "WAN", description: "Static IP, DHCP client or PPPoE configuration." },
        { title: "LAN & VLANs", description: "Create, edit and remove LAN and VLAN interfaces." },
        { title: "Guest / IoT networks", description: "Isolated network segments with their own DHCP scope." },
      ]} />
      <NotImplementedSection title="Diagnostics" items={[
        { title: "Ping / traceroute / nslookup", description: "Run network diagnostics from this device." },
      ]} />
    </div>
  );
}
