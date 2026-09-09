"use client";
import { useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";
import { DiagnosticsCard } from "@/components/diagnostics-card";
import { NotImplementedSection } from "@/components/not-implemented";
import { AdministrationCard, LogsCard, OpkgCard, ProcessesCard, RebootCard, SystemCard } from "@/components/system-settings";

export default function SystemSettingsPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  if (!routers) return <p className="mt-8 text-sm text-slate-500">Loading devices…</p>;
  if (!routers.length) return <div className="mt-8"><NoDevices /></div>;
  return (
    <div className="mt-8 space-y-8">
      <DevicePicker routers={routers} value={selected} onChange={setSelected} />
      {selected && <>
        <SystemCard deviceId={selected} />
        <AdministrationCard deviceId={selected} />
        <RebootCard deviceId={selected} />
        <LogsCard deviceId={selected} />
        <ProcessesCard deviceId={selected} />
        <OpkgCard deviceId={selected} />
        <DiagnosticsCard deviceId={selected} />
        <NotImplementedSection title="Maintenance" items={[
          { title: "Backup & restore", description: "Configuration archive (tar.gz) download and restore." },
          { title: "Firmware update", description: "Attended sysupgrade or manual image flash." },
          { title: "LED configuration", description: "Assign triggers to physical LEDs." },
        ]} />
      </>}
    </div>
  );
}
