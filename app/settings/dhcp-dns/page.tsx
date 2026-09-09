"use client";
import { useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";
import { NotImplementedSection } from "@/components/not-implemented";

export default function DhcpDnsSettingsPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  if (!routers) return <p className="mt-8 text-sm text-slate-500">Loading devices…</p>;
  if (!routers.length) return <div className="mt-8"><NoDevices /></div>;
  return (
    <div className="mt-8 space-y-8">
      <DevicePicker routers={routers} value={selected} onChange={setSelected} />
      <NotImplementedSection title="DHCP" items={[
        { title: "Static leases", description: "IP reservations by MAC address. Also reachable from a client's Settings tab on the Client Devices page." },
        { title: "DHCP scopes", description: "Address pool and lease time per network." },
      ]} />
      <NotImplementedSection title="DNS" items={[
        { title: "Custom DNS records / dnsmasq rules", description: "Local domain overrides and forwarders." },
        { title: "DoH / DoT", description: "Encrypted upstream DNS configuration." },
      ]} />
    </div>
  );
}
