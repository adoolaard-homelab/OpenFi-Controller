"use client";
import { NotImplementedSection } from "@/components/not-implemented";

export default function WifiSettingsPage() {
  return (
    <div className="mt-8 space-y-8">
      <p className="text-sm text-slate-500">SSID profiles apply across every adopted access point that carries them. Per-radio hardware settings (channel, TX power) live on the <a className="text-sky-400" href="/radios">Radios</a> page.</p>
      <NotImplementedSection title="SSID profiles" items={[
        { title: "Personal / Enterprise networks", description: "WPA2/WPA3 SSIDs, shared across selected APs." },
        { title: "Guest network", description: "Isolated guest SSID with client isolation." },
        { title: "Hidden SSID & MAC filtering", description: "Broadcast and access-control options per SSID." },
      ]} />
    </div>
  );
}
