"use client";
import { Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";
import { NextPhaseFeature } from "@/components/not-implemented";

type Lan = { proto: string; ipaddr: string; netmask: string };
type Lease = { hostname: string; ipaddr: string; macaddr: string; expires: number };
type StaticLease = { id: string; name: string; mac: string; ip: string };

const remaining = (seconds: number) => (seconds > 0 ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m` : "Expired");

function LanCard({ deviceId }: { deviceId: string }) {
  const [lan, setLan] = useState<Lan>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setLan(undefined); void fetch(`/api/routers/${deviceId}/network`).then((r) => r.json()).then((data) => setLan(data.lan)); }, [deviceId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    const form = new FormData(event.currentTarget);
    const values = { ipaddr: String(form.get("ipaddr")), netmask: String(form.get("netmask")) };
    const response = await fetch(`/api/routers/${deviceId}/network`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ target: "lan", values }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Could not save LAN settings."); else { setLan((prev) => ({ ...prev!, ...values })); setSaved(true); }
    setSaving(false);
  }
  return (
    <section className="panel p-5">
      <p className="section-label">LAN Network</p>
      {!lan ? <p className="text-sm text-slate-500">Loading…</p> : (
        <form onSubmit={submit} className="grid max-w-md gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label>Router IP address<input name="ipaddr" defaultValue={lan.ipaddr} required /></label>
            <label>Subnet mask<input name="netmask" defaultValue={lan.netmask} required /></label>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          {saved && <p className="text-sm text-emerald-500">Saved and applied.</p>}
          <button disabled={saving} className="button-primary w-fit">{saving ? "Saving…" : "Save changes"}</button>
        </form>
      )}
    </section>
  );
}

function DhcpCard({ deviceId }: { deviceId: string }) {
  const [leases, setLeases] = useState<Lease[]>();
  const [staticLeases, setStaticLeases] = useState<StaticLease[]>([]);
  const [error, setError] = useState("");
  const refresh = () => fetch(`/api/routers/${deviceId}/dhcp`).then((r) => r.json()).then((data) => { setLeases(data.leases ?? []); setStaticLeases(data.staticLeases ?? []); });
  useEffect(() => { setLeases(undefined); void refresh(); }, [deviceId]);

  async function addReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch(`/api/routers/${deviceId}/dhcp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not add reservation."); return; }
    form.reset(); void refresh();
  }
  async function removeReservation(id: string) { await fetch(`/api/routers/${deviceId}/dhcp?id=${encodeURIComponent(id)}`, { method: "DELETE" }); void refresh(); }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="panel overflow-hidden">
        <p className="section-label border-b border-slate-200 p-5 !mb-0">Active DHCP Leases</p>
        <div className="overflow-x-auto"><table className="client-table"><thead><tr><th>Client</th><th>IP</th><th>MAC</th><th>Remaining</th></tr></thead>
          <tbody>{leases?.map((lease) => <tr key={lease.macaddr} className="!cursor-default"><td>{lease.hostname || "—"}</td><td>{lease.ipaddr}</td><td className="font-mono text-xs">{lease.macaddr}</td><td>{remaining(lease.expires)}</td></tr>)}</tbody>
        </table>{leases && !leases.length && <p className="p-8 text-center text-sm text-slate-500">No active leases.</p>}{!leases && <p className="p-8 text-center text-sm text-slate-500">Loading…</p>}</div>
      </section>
      <section className="panel overflow-hidden">
        <p className="section-label border-b border-slate-200 p-5 !mb-0">Static IP Reservations</p>
        <div className="overflow-x-auto"><table className="client-table"><thead><tr><th>Name</th><th>IP</th><th>MAC</th><th></th></tr></thead>
          <tbody>{staticLeases.map((lease) => (
            <tr key={lease.id} className="!cursor-default"><td>{lease.name || "—"}</td><td>{lease.ip}</td><td className="font-mono text-xs">{lease.mac}</td>
              <td><button aria-label="Remove reservation" onClick={() => removeReservation(lease.id)} className="text-slate-500 hover:text-rose-400"><Trash2 size={15} /></button></td></tr>
          ))}</tbody>
        </table></div>
        <form onSubmit={addReservation} className="flex flex-wrap items-end gap-3 border-t border-slate-200 p-4">
          <label className="min-w-[110px] flex-1">Name<input name="name" placeholder="Printer" /></label>
          <label className="min-w-[150px] flex-1">MAC address<input name="mac" required placeholder="AA:BB:CC:DD:EE:FF" /></label>
          <label className="min-w-[130px] flex-1">IP address<input name="ip" required placeholder="192.168.1.50" /></label>
          <button className="button-secondary">Reserve</button>
        </form>
        {error && <p className="px-4 pb-4 text-sm text-rose-400">{error}</p>}
      </section>
    </div>
  );
}

export default function NetworksSettingsPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  if (!routers) return <p className="mt-8 text-sm text-slate-500">Loading devices…</p>;
  if (!routers.length) return <div className="mt-8"><NoDevices /></div>;
  return (
    <div className="mt-8 space-y-8">
      <DevicePicker routers={routers} value={selected} onChange={setSelected} />
      {selected && <LanCard deviceId={selected} />}
      {selected && <DhcpCard deviceId={selected} />}
      <NextPhaseFeature title="VLANs & multi-network trunking" description="Zit als complex OpenWrt-subsysteem gepland: het aanmaken van extra VLAN/subnet-netwerken met eigen DHCP-scope en trunk-poorten volgt in een volgende fase." />
    </div>
  );
}
