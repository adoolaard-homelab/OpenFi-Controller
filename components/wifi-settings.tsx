"use client";
import { Plus, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";

export type Band = "2.4GHz" | "5GHz";
export type RadioWithRouter = { section: string; band: Band; channel: string; disabled: boolean; up?: boolean; routerId: string; routerName: string; availableChannels: { channel: number; restricted: boolean }[] };
export type SsidMember = { routerId: string; routerName: string; section: string; radioSection: string; band: Band; disabled: boolean };
export type SsidGroup = { name: string; network: string; security: string; bands: Band[]; broadcastingAPs: number; clients: number; members: SsidMember[] };
export type WifiDevice = { id: string; name: string; reachable: boolean; radios: { section: string; band: Band }[] };

const CHANNELS_24 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const CHANNELS_5 = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
const DFS_5 = new Set([52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144]);

function channelStatus(channel: number, band: Band, radios: RadioWithRouter[]): { state: "in-use" | "dfs" | "restricted" | "available"; label: string } {
  const onBand = radios.filter((radio) => radio.band === band);
  const inUse = onBand.some((radio) => !radio.disabled && Number(radio.channel) === channel);
  if (inUse) return { state: "in-use", label: "In use by an adopted AP" };
  const restricted = onBand.some((radio) => radio.availableChannels.some((c) => c.channel === channel && c.restricted));
  if (restricted) return { state: "restricted", label: "Not available in this regulatory domain" };
  if (band === "5GHz" && DFS_5.has(channel)) return { state: "dfs", label: "DFS channel (radar detection required)" };
  return { state: "available", label: "Available" };
}

function ChannelBlock({ channel, band, radios }: { channel: number; band: Band; radios: RadioWithRouter[] }) {
  const { state, label } = channelStatus(channel, band, radios);
  const classes = { "in-use": "border-emerald-400 bg-emerald-400 text-white", dfs: "border-violet-300 bg-violet-50 text-violet-600", restricted: "border-rose-200 bg-rose-50 text-rose-300", available: "border-slate-200 bg-white text-slate-500" }[state];
  return <div title={`Channel ${channel} · ${label}`} className={`grid h-11 place-items-center rounded-md border text-[11px] font-semibold ${classes}`}>{channel}</div>;
}

export function ChannelizationMatrix({ radios }: { radios: RadioWithRouter[] }) {
  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between"><p className="section-label !mb-0">Channelization</p>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400" />In use</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm border border-violet-300 bg-violet-50" />DFS</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm border border-rose-200 bg-rose-50" />Not available</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm border border-slate-200 bg-white" />Available</span>
        </div>
      </div>
      <div className="mt-5"><p className="text-xs font-medium text-slate-600">2.4 GHz <span className="text-slate-400">· 20/40 MHz · channels 1–13</span></p>
        <div className="mt-2 grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5">{CHANNELS_24.map((channel) => <ChannelBlock key={channel} channel={channel} band="2.4GHz" radios={radios} />)}</div>
      </div>
      <div className="mt-6"><p className="text-xs font-medium text-slate-600">5 GHz <span className="text-slate-400">· 20/40/80/160 MHz · channels 36–165</span></p>
        <div className="mt-2 grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5">{CHANNELS_5.map((channel) => <ChannelBlock key={channel} channel={channel} band="5GHz" radios={radios} />)}</div>
      </div>
    </section>
  );
}

export function CreateSsidModal({ devices, onClose, onCreated }: { devices: WifiDevice[]; onClose: () => void; onCreated: () => void }) {
  const [security, setSecurity] = useState("psk2");
  const [targets, setTargets] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toggle = (key: string) => setTargets((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSaving(true);
    try {
      const form = new FormData(event.currentTarget);
      const body = {
        ssid: String(form.get("ssid") ?? ""), network: String(form.get("network") ?? "lan"),
        encryption: security, key: String(form.get("key") ?? ""), hidden: form.get("hidden") === "on",
        targets: [...targets].map((key) => { const [routerId, radioSection] = key.split("|"); return { routerId, radioSection }; }),
      };
      const response = await fetch("/api/wifi", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error ?? "Could not create SSID."); return; }
      onCreated(); onClose();
    } catch { setError("Could not reach the controller. Please try again."); } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop"><form onSubmit={submit} className="modal-card !max-w-xl">
      <div className="flex items-start justify-between"><div><p className="eyebrow">Wireless network</p><h2 className="mt-1 text-xl font-semibold">Create New SSID</h2><p className="mt-2 text-sm text-slate-500">Broadcast this network from one or more adopted access point radios.</p></div>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900"><X /></button></div>
      <div className="mt-6 grid gap-4">
        <label>Network name (SSID)<input name="ssid" required placeholder="Home WiFi" maxLength={32} /></label>
        <div className="grid grid-cols-2 gap-4">
          <label>Network<select name="network" className="select-field"><option value="lan">lan</option><option value="guest">guest</option></select></label>
          <label>Security<select value={security} onChange={(e) => setSecurity(e.target.value)} className="select-field">
            <option value="psk2">WPA2 Personal</option><option value="sae-mixed">WPA2/WPA3 Personal</option><option value="sae">WPA3 Personal</option><option value="none">Open</option>
          </select></label>
        </div>
        {security !== "none" && <label>Password<input name="key" type="password" minLength={8} required placeholder="At least 8 characters" /></label>}
        <label className="flex items-center gap-2 !text-slate-700"><input name="hidden" type="checkbox" className="!mt-0 w-auto" />Hide SSID broadcast</label>
        <div>
          <span className="section-label !mb-1.5">Broadcast on</span>
          <div className="detail-card grid max-h-44 gap-2 overflow-y-auto">
            {devices.length ? devices.map((device) => (
              <div key={device.id}>
                <p className="text-xs font-medium text-slate-600">{device.name}{!device.reachable && <span className="ml-2 text-rose-400">unreachable</span>}</p>
                <div className="mt-1 flex flex-wrap gap-3">
                  {device.radios.map((radio) => { const key = `${device.id}|${radio.section}`; return (
                    <label key={key} className="flex items-center gap-1.5 !text-slate-600"><input type="checkbox" className="!mt-0 w-auto" checked={targets.has(key)} onChange={() => toggle(key)} />{radio.band}</label>
                  ); })}
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No adopted access points yet.</p>}
          </div>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
      <div className="mt-7 flex justify-end gap-3"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button disabled={saving || !targets.size} className="button-primary">{saving ? "Creating…" : "Create SSID"}</button></div>
    </form></div>
  );
}

export function SsidDrawer({ group, close, onChanged }: { group: SsidGroup; close: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState("");
  async function toggleMember(member: SsidMember) {
    setBusy(member.section);
    await fetch("/api/wifi", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ routerId: member.routerId, section: member.section, values: { disabled: member.disabled ? "0" : "1" } }) });
    setBusy(""); onChanged();
  }
  async function removeMember(member: SsidMember) {
    setBusy(member.section);
    await fetch("/api/wifi", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ members: [{ routerId: member.routerId, section: member.section }] }) });
    setBusy(""); onChanged();
  }
  async function removeAll() {
    setBusy("all");
    await fetch("/api/wifi", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ members: group.members.map((m) => ({ routerId: m.routerId, section: m.section })) }) });
    setBusy(""); onChanged(); close();
  }
  return (
    <div className="drawer-backdrop"><aside className="drawer flex flex-col">
      <div className="flex items-start justify-between border-b border-slate-200 p-6">
        <div><h2 className="font-semibold">{group.name}</h2><p className="mt-1 text-sm text-slate-500">{group.security} · {group.bands.join(" + ")} · broadcasting from {group.broadcastingAPs} AP{group.broadcastingAPs === 1 ? "" : "s"}</p></div>
        <button aria-label="Close" className="text-slate-500 hover:text-slate-900" onClick={close}><X /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {group.members.map((member) => (
          <div key={`${member.routerId}-${member.section}`} className="detail-card flex items-center justify-between">
            <div><p className="font-medium">{member.routerName}</p><p className="mt-1 text-xs text-slate-500">{member.band} · {member.disabled ? "Disabled" : "Broadcasting"}</p></div>
            <div className="flex items-center gap-3">
              <button disabled={busy === member.section} onClick={() => toggleMember(member)} className="button-secondary !px-3 !py-1.5 text-xs">{member.disabled ? "Enable" : "Disable"}</button>
              <button disabled={busy === member.section} aria-label="Remove from this AP" onClick={() => removeMember(member)} className="text-slate-500 hover:text-rose-400"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 p-6"><button disabled={busy === "all"} onClick={removeAll} className="button-secondary w-full !text-rose-500">{busy === "all" ? "Removing…" : "Delete SSID everywhere"}</button></div>
    </aside></div>
  );
}

export function CreateSsidButton({ onClick }: { onClick: () => void }) {
  return <button className="button-primary" onClick={onClick}><Plus size={16} /> Create New</button>;
}
