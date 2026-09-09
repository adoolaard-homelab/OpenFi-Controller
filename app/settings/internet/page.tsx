"use client";
import { FormEvent, useEffect, useState } from "react";
import { DevicePicker, NoDevices, useDeviceScope } from "@/components/device-picker";

type Wan = { proto: string; ipaddr: string; netmask: string; gateway: string; username: string };

function WanCard({ deviceId }: { deviceId: string }) {
  const [wan, setWan] = useState<Wan>();
  const [proto, setProto] = useState("dhcp");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setWan(undefined); void fetch(`/api/routers/${deviceId}/network`).then((r) => r.json()).then((data) => { setWan(data.wan); setProto(data.wan?.proto ?? "dhcp"); }); }, [deviceId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    const form = new FormData(event.currentTarget);
    const values: Record<string, string> = { proto };
    if (proto === "static") { values.ipaddr = String(form.get("ipaddr")); values.netmask = String(form.get("netmask")); values.gateway = String(form.get("gateway")); }
    if (proto === "pppoe") { values.username = String(form.get("username")); const password = String(form.get("password") ?? ""); if (password) values.password = password; }
    const response = await fetch(`/api/routers/${deviceId}/network`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ target: "wan", values }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Could not save WAN settings."); else setSaved(true);
    setSaving(false);
  }

  return (
    <section className="panel p-5">
      <p className="section-label">WAN Interface</p>
      {!wan ? <p className="text-sm text-slate-500">Loading…</p> : (
        <form onSubmit={submit} className="grid max-w-md gap-4">
          <label>Connection type<select className="select-field" value={proto} onChange={(e) => setProto(e.target.value)}>
            <option value="dhcp">Automatic (DHCP)</option><option value="static">Static IP</option><option value="pppoe">PPPoE</option>
          </select></label>
          {proto === "static" && <div className="grid grid-cols-2 gap-4">
            <label>IP address<input name="ipaddr" defaultValue={wan.ipaddr} required /></label>
            <label>Subnet mask<input name="netmask" defaultValue={wan.netmask} required /></label>
            <label className="col-span-2">Gateway<input name="gateway" defaultValue={wan.gateway} required /></label>
          </div>}
          {proto === "pppoe" && <div className="grid grid-cols-2 gap-4">
            <label>PPPoE username<input name="username" defaultValue={wan.username} required /></label>
            <label>PPPoE password<input name="password" type="password" placeholder="Leave blank to keep current" /></label>
          </div>}
          {error && <p className="text-sm text-rose-400">{error}</p>}
          {saved && <p className="text-sm text-emerald-500">Saved and applied.</p>}
          <button disabled={saving} className="button-primary w-fit">{saving ? "Saving…" : "Save changes"}</button>
        </form>
      )}
    </section>
  );
}

export default function InternetSettingsPage() {
  const [selected, setSelected] = useState<string>();
  const routers = useDeviceScope(selected, setSelected);
  if (!routers) return <p className="mt-8 text-sm text-slate-500">Loading devices…</p>;
  if (!routers.length) return <div className="mt-8"><NoDevices /></div>;
  return (
    <div className="mt-8 space-y-8">
      <DevicePicker routers={routers} value={selected} onChange={setSelected} />
      {selected && <WanCard deviceId={selected} />}
    </div>
  );
}
