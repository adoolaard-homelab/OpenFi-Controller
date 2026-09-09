"use client";
import { Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";
import { NextPhaseFeature } from "@/components/not-implemented";

type Forward = { id: string; name: string; proto: string; srcDPort: string; destIp: string; destPort: string; enabled: boolean };

function PortForwardingCard({ deviceId }: { deviceId: string }) {
  const [forwards, setForwards] = useState<Forward[]>();
  const [error, setError] = useState("");
  const refresh = () => fetch(`/api/routers/${deviceId}/firewall`).then((r) => r.json()).then((data) => setForwards(data.forwards ?? []));
  useEffect(() => { setForwards(undefined); void refresh(); }, [deviceId]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = event.currentTarget;
    const response = await fetch(`/api/routers/${deviceId}/firewall`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not add port forward."); return; }
    form.reset(); void refresh();
  }
  async function remove(id: string) { await fetch(`/api/routers/${deviceId}/firewall?id=${encodeURIComponent(id)}`, { method: "DELETE" }); void refresh(); }

  return (
    <section className="panel overflow-hidden">
      <p className="section-label border-b border-slate-200 p-5 !mb-0">Port Forwarding</p>
      <div className="overflow-x-auto"><table className="client-table"><thead><tr><th>Name</th><th>Protocol</th><th>WAN port</th><th>Destination</th><th></th></tr></thead>
        <tbody>{forwards?.map((forward) => (
          <tr key={forward.id} className="!cursor-default"><td>{forward.name}</td><td className="uppercase">{forward.proto}</td><td>{forward.srcDPort}</td><td>{forward.destIp}:{forward.destPort}</td>
            <td><button aria-label="Remove rule" onClick={() => remove(forward.id)} className="text-slate-500 hover:text-rose-400"><Trash2 size={15} /></button></td></tr>
        ))}</tbody>
      </table>{forwards && !forwards.length && <p className="p-8 text-center text-sm text-slate-500">No port forwards configured.</p>}{!forwards && <p className="p-8 text-center text-sm text-slate-500">Loading…</p>}</div>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3 border-t border-slate-200 p-4">
        <label className="min-w-[110px] flex-1">Name<input name="name" placeholder="Home server" /></label>
        <label className="min-w-[90px]">Protocol<select name="proto" className="select-field"><option value="tcp">TCP</option><option value="udp">UDP</option><option value="tcpudp">TCP+UDP</option></select></label>
        <label className="min-w-[100px]">WAN port<input name="srcDPort" required placeholder="8080" /></label>
        <label className="min-w-[130px] flex-1">Destination IP<input name="destIp" required placeholder="192.168.1.20" /></label>
        <label className="min-w-[100px]">Dest. port<input name="destPort" required placeholder="80" /></label>
        <button className="button-secondary">Add rule</button>
      </form>
      {error && <p className="px-4 pb-4 text-sm text-rose-400">{error}</p>}
    </section>
  );
}

export default function SecuritySettingsPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  if (!routers) return <p className="mt-8 text-sm text-slate-500">Loading devices…</p>;
  if (!routers.length) return <div className="mt-8"><NoDevices /></div>;
  return (
    <div className="mt-8 space-y-8">
      <DevicePicker routers={routers} value={selected} onChange={setSelected} />
      {selected && <PortForwardingCard deviceId={selected} />}
      <NextPhaseFeature title="Zone-based firewall & traffic rules" description="Zone-based firewall (WAN/LAN/Guest zones, forwarding policy) en geavanceerde traffic rules zijn als apart subsysteem gepland en volgen in een volgende fase." />
    </div>
  );
}
