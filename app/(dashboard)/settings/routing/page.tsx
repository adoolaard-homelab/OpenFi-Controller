"use client";
import { Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";

type Route = { id: string; target: string; netmask: string; gateway: string; interface: string };

function RoutesCard({ deviceId }: { deviceId: string }) {
  const [routes, setRoutes] = useState<Route[]>();
  const [error, setError] = useState("");
  const refresh = useCallback(() => fetch(`/api/routers/${deviceId}/routes`).then((r) => r.json()).then((data) => setRoutes(data.routes ?? [])), [deviceId]);
  useEffect(() => { setRoutes(undefined); void refresh(); }, [refresh]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = event.currentTarget;
    const response = await fetch(`/api/routers/${deviceId}/routes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not add route."); return; }
    form.reset(); void refresh();
  }
  async function remove(id: string) { await fetch(`/api/routers/${deviceId}/routes?id=${encodeURIComponent(id)}`, { method: "DELETE" }); void refresh(); }

  return (
    <section className="panel overflow-hidden">
      <p className="section-label border-b border-slate-200 p-5 !mb-0">Static Routes</p>
      <div className="overflow-x-auto"><table className="client-table"><thead><tr><th>Destination</th><th>Netmask</th><th>Gateway</th><th>Interface</th><th></th></tr></thead>
        <tbody>{routes?.map((route) => (
          <tr key={route.id} className="!cursor-default"><td>{route.target}</td><td>{route.netmask}</td><td>{route.gateway}</td><td>{route.interface}</td>
            <td><button aria-label="Remove route" onClick={() => remove(route.id)} className="text-slate-500 hover:text-rose-400"><Trash2 size={15} /></button></td></tr>
        ))}</tbody>
      </table>{routes && !routes.length && <p className="p-8 text-center text-sm text-slate-500">No static routes configured.</p>}{!routes && <p className="p-8 text-center text-sm text-slate-500">Loading…</p>}</div>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3 border-t border-slate-200 p-4">
        <label className="min-w-[130px] flex-1">Destination<input name="target" required placeholder="10.0.10.0" /></label>
        <label className="min-w-[130px] flex-1">Netmask<input name="netmask" defaultValue="255.255.255.0" /></label>
        <label className="min-w-[130px] flex-1">Gateway<input name="gateway" required placeholder="192.168.1.254" /></label>
        <label className="min-w-[100px] flex-1">Interface<select name="interface" className="select-field"><option value="lan">lan</option><option value="wan">wan</option></select></label>
        <button className="button-secondary">Add route</button>
      </form>
      {error && <p className="px-4 pb-4 text-sm text-rose-400">{error}</p>}
    </section>
  );
}

export default function RoutingSettingsPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  if (!routers) return <p className="mt-8 text-sm text-slate-500">Loading devices…</p>;
  if (!routers.length) return <div className="mt-8"><NoDevices /></div>;
  return (
    <div className="mt-8 space-y-8">
      <DevicePicker routers={routers} value={selected} onChange={setSelected} />
      {selected && <RoutesCard deviceId={selected} />}
    </div>
  );
}
