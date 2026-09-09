"use client";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { ChannelizationMatrix, CreateSsidButton, CreateSsidModal, SsidDrawer, type RadioWithRouter, type SsidGroup, type WifiDevice } from "@/components/wifi-settings";

type WifiOverview = { radios: RadioWithRouter[]; ssidGroups: SsidGroup[]; devices: WifiDevice[] };

export default function WifiSettingsPage() {
  const [data, setData] = useState<WifiOverview>();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<SsidGroup>();
  const refresh = () => fetch("/api/wifi").then((r) => r.json()).then(setData).catch(() => setData({ radios: [], ssidGroups: [], devices: [] }));
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="mt-8 space-y-8">
      <p className="text-sm text-slate-500">SSID profiles apply across every access point radio they are broadcast from. Per-radio channel and TX power live on the <a className="text-sky-400" href="/radios">Radios</a> page.</p>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
          <div><p className="section-label !mb-0">Wireless Networks</p></div>
          <CreateSsidButton onClick={() => setCreating(true)} />
        </div>
        <div className="overflow-x-auto"><table className="client-table">
          <thead><tr>{["Name", "Network", "Broadcasting APs", "WiFi Band", "Clients", "Security"].map((h) => <th key={h}>{h}<ChevronDown size={12} /></th>)}</tr></thead>
          <tbody>{data?.ssidGroups.map((group) => (
            <tr key={group.name} onClick={() => setSelected(group)}>
              <td><b>{group.name}</b></td>
              <td>{group.network}</td>
              <td>{group.broadcastingAPs}</td>
              <td>{group.bands.join(" + ")}</td>
              <td>{group.clients}</td>
              <td>{group.security}</td>
            </tr>
          ))}</tbody>
        </table>
          {!data ? <p className="p-12 text-center text-slate-500">Loading wireless networks…</p> : !data.ssidGroups.length && <p className="p-12 text-center text-slate-500">No SSIDs configured yet. Create one to get started.</p>}
        </div>
      </section>

      {data && <ChannelizationMatrix radios={data.radios} />}

      {creating && data && <CreateSsidModal devices={data.devices} onClose={() => setCreating(false)} onCreated={refresh} />}
      {selected && <SsidDrawer group={selected} close={() => setSelected(undefined)} onChanged={() => { void refresh(); setSelected(undefined); }} />}
    </div>
  );
}
