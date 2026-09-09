"use client";
import { useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";
import { NotImplementedSection } from "@/components/not-implemented";

export default function SystemSettingsPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  if (!routers) return <p className="mt-8 text-sm text-slate-500">Loading devices…</p>;
  if (!routers.length) return <div className="mt-8"><NoDevices /></div>;
  return (
    <div className="mt-8 space-y-8">
      <DevicePicker routers={routers} value={selected} onChange={setSelected} />
      <NotImplementedSection title="System" items={[
        { title: "Hostname & timezone", description: "Device hostname and system timezone." },
        { title: "NTP", description: "Time sync servers." },
      ]} />
      <NotImplementedSection title="Administration" items={[
        { title: "Root password", description: "Change the device's admin password." },
        { title: "SSH access", description: "Port, authorized keys and allowed interfaces." },
      ]} />
      <NotImplementedSection title="Maintenance" items={[
        { title: "Reboot", description: "Restart this device." },
        { title: "Backup & restore", description: "Configuration archive (tar.gz) download and restore." },
        { title: "Firmware update", description: "Attended sysupgrade or manual image flash." },
        { title: "LED configuration", description: "Assign triggers to physical LEDs." },
      ]} />
    </div>
  );
}
