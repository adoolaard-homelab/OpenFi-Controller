"use client";
import { useEffect, useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";
import { NextPhaseSection, NotImplemented } from "@/components/not-implemented";
import { RadioCard } from "@/components/radio-card";
import type { Band } from "@/components/wifi-settings";

type Radio = { section: string; band: Band; channel: string; htmode: string; txpower?: number; disabled: boolean; up?: boolean; availableChannels: { channel: number; restricted: boolean }[] };

export default function RadiosPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  const [radios, setRadios] = useState<Radio[]>();
  const refresh = () => selected && fetch(`/api/routers/${selected}/wifi`).then((r) => r.json()).then((data) => setRadios(data.radios ?? []));
  useEffect(() => { setRadios(undefined); void refresh(); }, [selected]);

  return (
    <div className="page">
      <p className="eyebrow">Wireless</p>
      <h1 className="page-title">Radios</h1>
      <p className="subtitle">Per-AP radio hardware: channel, width and TX power. SSIDs live under Settings → WiFi.</p>
      {!routers ? <p className="mt-8 text-sm text-slate-500">Loading devices…</p> : !routers.length ? <div className="mt-8"><NoDevices /></div> : (
        <div className="mt-8 space-y-8">
          <DevicePicker routers={routers} value={selected} onChange={setSelected} />
          {!radios ? <p className="text-sm text-slate-500">Loading radios…</p> : radios.length ? (
            <div className="grid gap-6 lg:grid-cols-2">{radios.map((radio) => <RadioCard key={radio.section} deviceId={selected!} radio={radio} onSaved={refresh} />)}</div>
          ) : <NotImplemented title="No radios reported" description="This device did not report any wifi-device radios over ubus." />}
          <NextPhaseSection title="Channel analysis" items={[
            { title: "Spectrum scan", description: "Nearby AP survey, channel occupancy and interference." },
            { title: "Recommended channel", description: "Automatic best-channel suggestion per radio." },
          ]} />
        </div>
      )}
    </div>
  );
}
