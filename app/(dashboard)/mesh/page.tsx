"use client";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { NoDevices } from "@/components/device-picker";
import { CreateMeshButton, CreateMeshModal, MeshGroupDrawer, MeshInfoPanel, type MeshGroup } from "@/components/mesh-settings";
import type { RadioWithRouter, WifiDevice } from "@/components/wifi-settings";

type MeshOverview = { groups: MeshGroup[]; radios: RadioWithRouter[]; devices: WifiDevice[] };

export default function MeshPage() {
  const [data, setData] = useState<MeshOverview>();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<MeshGroup>();
  const refresh = () => fetch("/api/mesh").then((r) => r.json()).then(setData).catch(() => setData({ groups: [], radios: [], devices: [] }));
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="page">
      <p className="eyebrow">Wireless</p>
      <h1 className="page-title">Mesh</h1>
      <p className="subtitle">Automated 802.11s wireless backhaul between adopted OpenWrt devices — a single-hop WiFi extender mesh, bridged onto the LAN.</p>
      {data && !data.devices.length ? <div className="mt-8"><NoDevices /></div> : (
        <div className="mt-8 space-y-8">
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
              <p className="section-label !mb-0">Mesh Networks</p>
              {data && <CreateMeshButton onClick={() => setCreating(true)} />}
            </div>
            <div className="overflow-x-auto"><table className="client-table">
              <thead><tr>{["Mesh ID", "Network", "WiFi Band", "Radios", "Peers linked", "Security"].map((h) => <th key={h}>{h}<ChevronDown size={12} /></th>)}</tr></thead>
              <tbody>{data?.groups.map((group) => (
                <tr key={group.meshId} onClick={() => setSelected(group)}>
                  <td><b>{group.meshId}</b></td>
                  <td>{group.network}</td>
                  <td>{group.bands.join(" + ")}</td>
                  <td>{group.members.length}</td>
                  <td>{group.peers}</td>
                  <td>{group.security}</td>
                </tr>
              ))}</tbody>
            </table>
              {!data ? <p className="p-12 text-center text-slate-500">Loading mesh networks…</p> : !data.groups.length && <p className="p-12 text-center text-slate-500">No mesh networks yet. Join radios to a mesh to get started.</p>}
            </div>
          </section>
          <MeshInfoPanel />
        </div>
      )}
      {creating && data && <CreateMeshModal radios={data.radios} devices={data.devices} onClose={() => setCreating(false)} onCreated={refresh} />}
      {selected && <MeshGroupDrawer group={selected} close={() => setSelected(undefined)} onChanged={() => { void refresh(); setSelected(undefined); }} />}
    </div>
  );
}
