"use client";
import { useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";
import { NotImplementedSection } from "@/components/not-implemented";

export default function RadiosPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  return (
    <div className="page">
      <p className="eyebrow">Wireless</p>
      <h1 className="page-title">Radios</h1>
      <p className="subtitle">Per-AP radio hardware, SSIDs and spectrum analysis.</p>
      {!routers ? <p className="mt-8 text-sm text-slate-500">Loading devices…</p> : !routers.length ? <div className="mt-8"><NoDevices /></div> : (
        <div className="mt-8 space-y-8">
          <DevicePicker routers={routers} value={selected} onChange={setSelected} />
          <NotImplementedSection title="Radio hardware" items={[
            { title: "Channel & width", description: "20/40/80/160MHz channel width and channel selection per radio." },
            { title: "TX power & country code", description: "Transmit power and regulatory domain per radio." },
          ]} />
          <NotImplementedSection title="SSIDs" items={[
            { title: "SSID management", description: "WPA2/WPA3 Personal/Enterprise, guest isolation, hidden SSID." },
            { title: "Fast roaming", description: "802.11r/mesh roaming between adopted APs." },
          ]} />
          <NotImplementedSection title="Channel analysis" items={[
            { title: "Spectrum scan", description: "Nearby AP survey, channel occupancy and interference." },
            { title: "Recommended channel", description: "Automatic best-channel suggestion per radio." },
          ]} />
        </div>
      )}
    </div>
  );
}
