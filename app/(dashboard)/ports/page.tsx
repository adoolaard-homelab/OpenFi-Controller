"use client";
import { useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";
import { NotImplemented } from "@/components/not-implemented";

export default function PortsPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  return (
    <div className="page">
      <p className="eyebrow">Switching</p>
      <h1 className="page-title">Ports</h1>
      <p className="subtitle">Physical port link status and VLAN assignment per device.</p>
      {!routers ? <p className="mt-8 text-sm text-slate-500">Loading devices…</p> : !routers.length ? <div className="mt-8"><NoDevices /></div> : (
        <div className="mt-8 space-y-6">
          <DevicePicker routers={routers} value={selected} onChange={setSelected} />
          <NotImplemented
            title="Port matrix"
            description="The physical port map (link speed, up/down state) and native/tagged VLAN assignment per port is not implemented yet. It requires reading the device's switch/DSA topology over ubus, which the controller does not do yet."
          />
          <NotImplemented
            title="VLAN editor"
            description="Assigning native (untagged) and tagged VLANs per port will appear here once switch configuration is implemented."
          />
        </div>
      )}
    </div>
  );
}
