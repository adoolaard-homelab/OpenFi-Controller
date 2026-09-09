"use client";
import { Plus, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Band, RadioWithRouter, WifiDevice } from "@/components/wifi-settings";

export type MeshMember = { routerId: string; routerName: string; section: string; radioSection: string; band: Band; channel: string; disabled: boolean; up?: boolean; peers: number };
export type MeshGroup = { meshId: string; network: string; security: string; bands: Band[]; peers: number; members: MeshMember[] };
type MeshResult = { routerId: string; routerName: string; ok: boolean; note?: string; error?: string };

function nonRestrictedChannels(radio: RadioWithRouter): number[] {
  return radio.availableChannels.filter((c) => !c.restricted).map((c) => c.channel);
}

/** Channels every selected radio on this band can use, i.e. the set 802.11s peers on that band could share. */
function channelOptionsForBand(band: Band, selectedRadios: RadioWithRouter[]): number[] {
  const onBand = selectedRadios.filter((radio) => radio.band === band);
  return onBand.reduce<number[] | undefined>((acc, radio) => {
    const options = nonRestrictedChannels(radio);
    return acc === undefined ? options : acc.filter((c) => options.includes(c));
  }, undefined) ?? [];
}

/** Prefers whatever channel the selected radios on this band already share, falling back to the first
 * available option, so picking radios that are already aligned needs no manual choice. */
function defaultChannelForBand(band: Band, selectedRadios: RadioWithRouter[], options: number[]): number | undefined {
  const current = selectedRadios.filter((radio) => radio.band === band).map((radio) => Number(radio.channel)).filter((c) => options.includes(c));
  if (current.length) {
    const counts = new Map<number, number>();
    for (const c of current) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return options[0];
}

export function CreateMeshButton({ onClick }: { onClick: () => void }) {
  return <button className="button-primary" onClick={onClick}><Plus size={16} /> Join Mesh</button>;
}

export function CreateMeshModal({ radios, devices, onClose, onCreated }: { radios: RadioWithRouter[]; devices: WifiDevice[]; onClose: () => void; onCreated: () => void }) {
  const [security, setSecurity] = useState<"sae" | "none">("sae");
  const [autoWpad, setAutoWpad] = useState(true);
  const [targets, setTargets] = useState<Set<string>>(new Set());
  const [channelByBand, setChannelByBand] = useState<Partial<Record<Band, number>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<MeshResult[]>();

  const toggle = (key: string) => setTargets((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const selectedRadios = radios.filter((radio) => targets.has(`${radio.routerId}|${radio.section}`));
  const bandsInSelection = [...new Set(selectedRadios.map((radio) => radio.band))];
  const channelConflict = bandsInSelection.some((band) => channelOptionsForBand(band, selectedRadios).length === 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSaving(true); setResults(undefined);
    try {
      const form = new FormData(event.currentTarget);
      const body = {
        meshId: String(form.get("meshId") ?? ""), encryption: security, key: String(form.get("key") ?? ""), autoWpad,
        targets: selectedRadios.map((radio) => {
          const options = channelOptionsForBand(radio.band, selectedRadios);
          const channel = channelByBand[radio.band] ?? defaultChannelForBand(radio.band, selectedRadios, options);
          return { routerId: radio.routerId, radioSection: radio.section, channel: channel !== undefined ? String(channel) : "auto" };
        }),
      };
      const response = await fetch("/api/mesh", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 400) { setError(result.error ?? "Could not create mesh network."); return; }
      setResults(result.results ?? []);
      onCreated();
    } catch { setError("Could not reach the controller. Please try again."); } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop"><form onSubmit={submit} className="modal-card !max-w-xl">
      <div className="flex items-start justify-between">
        <div><p className="eyebrow">802.11s mesh</p><h2 className="mt-1 text-xl font-semibold">Join Devices to a Mesh</h2><p className="mt-2 text-sm text-slate-500">Every selected radio becomes a mesh point sharing one Mesh ID, channel and key, bridged onto the LAN.</p></div>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900"><X /></button>
      </div>
      <div className="mt-6 grid gap-4">
        <label>Mesh ID<input name="meshId" required placeholder="home-backhaul" maxLength={32} /></label>
        <div className="grid grid-cols-2 gap-4">
          <label>Security<select value={security} onChange={(e) => setSecurity(e.target.value as "sae" | "none")} className="select-field">
            <option value="sae">WPA3-SAE (recommended)</option><option value="none">Open (no encryption)</option>
          </select></label>
          {security === "sae" && <label>Mesh password<input name="key" type="password" minLength={8} required placeholder="At least 8 characters" /></label>}
        </div>
        <label className="flex items-center gap-2 !text-slate-700"><input type="checkbox" checked={autoWpad} onChange={(e) => setAutoWpad(e.target.checked)} className="!mt-0 w-auto" />Automatically install mesh-capable wpad (wpad-mesh-*) if needed</label>
        <div>
          <span className="section-label !mb-1.5">Mesh point radios</span>
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
        {bandsInSelection.length > 0 && (
          <div>
            <span className="section-label !mb-1.5">Shared channel per band</span>
            <p className="mb-2 text-xs text-slate-500">All mesh points on a band must use the same channel to peer.</p>
            <div className="grid grid-cols-2 gap-4">
              {bandsInSelection.map((band) => {
                const options = channelOptionsForBand(band, selectedRadios);
                const value = channelByBand[band] ?? defaultChannelForBand(band, selectedRadios, options);
                return (
                  <label key={band}>{band}<select className="select-field" value={value ?? ""} onChange={(e) => setChannelByBand((prev) => ({ ...prev, [band]: Number(e.target.value) }))}>
                    {options.length ? options.map((c) => <option key={c} value={c}>{c}</option>) : <option value="">No common channel available</option>}
                  </select></label>
                );
              })}
            </div>
            {channelConflict && <p className="mt-2 text-sm text-rose-400">Selected radios on one band share no common channel (regulatory domain or hardware limit). Deselect one and retry.</p>}
          </div>
        )}
      </div>
      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
      {results && (
        <div className="mt-4 space-y-1.5">
          {results.map((r) => <p key={r.routerId} className={`text-sm ${r.ok ? "text-emerald-600" : "text-rose-400"}`}>{r.routerName}: {r.ok ? (r.note ?? "Joined mesh.") : r.error}</p>)}
        </div>
      )}
      <div className="mt-7 flex justify-end gap-3">
        {results ? <button type="button" className="button-primary" onClick={onClose}>Done</button> : (
          <>
            <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
            <button disabled={saving || !targets.size || channelConflict} className="button-primary">{saving ? "Joining…" : "Join Mesh"}</button>
          </>
        )}
      </div>
    </form></div>
  );
}

export function MeshGroupDrawer({ group, close, onChanged }: { group: MeshGroup; close: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState("");
  async function toggleMember(member: MeshMember) {
    setBusy(member.section);
    await fetch("/api/mesh", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ routerId: member.routerId, section: member.section, values: { disabled: member.disabled ? "0" : "1" } }) });
    setBusy(""); onChanged();
  }
  async function removeMember(member: MeshMember) {
    setBusy(member.section);
    await fetch("/api/mesh", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ members: [{ routerId: member.routerId, section: member.section }] }) });
    setBusy(""); onChanged();
  }
  async function removeAll() {
    setBusy("all");
    await fetch("/api/mesh", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ members: group.members.map((m) => ({ routerId: m.routerId, section: m.section })) }) });
    setBusy(""); onChanged(); close();
  }
  const hasIssue = group.members.some((member) => !member.disabled && (!member.up || member.peers === 0));
  return (
    <div className="drawer-backdrop"><aside className="drawer flex flex-col">
      <div className="flex items-start justify-between border-b border-slate-200 p-6">
        <div><h2 className="font-semibold">{group.meshId}</h2><p className="mt-1 text-sm text-slate-500">{group.security} · {group.bands.join(" + ")} · {group.peers} peer link{group.peers === 1 ? "" : "s"} across {group.members.length} radio{group.members.length === 1 ? "" : "s"}</p></div>
        <button aria-label="Close" className="text-slate-500 hover:text-slate-900" onClick={close}><X /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {group.members.map((member) => (
          <div key={`${member.routerId}-${member.section}`} className="detail-card flex items-center justify-between">
            <div><p className="font-medium">{member.routerName}</p><p className="mt-1 text-xs text-slate-500">{member.band} · ch {member.channel} · {member.disabled ? "Disabled" : member.up ? `Up · ${member.peers} peer${member.peers === 1 ? "" : "s"}` : "Down"}</p></div>
            <div className="flex items-center gap-3">
              <button disabled={busy === member.section} onClick={() => toggleMember(member)} className="button-secondary !px-3 !py-1.5 text-xs">{member.disabled ? "Enable" : "Disable"}</button>
              <button disabled={busy === member.section} aria-label="Remove from mesh" onClick={() => removeMember(member)} className="text-slate-500 hover:text-rose-400"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {hasIssue && (
          <div className="detail-card !border-dashed !bg-amber-50/40">
            <p className="text-sm text-slate-600">A radio is down or has no peers yet. Confirm the driver supports mesh point mode (<code>iw list</code> should list &quot;mesh point&quot; under Supported interface modes) and that every peer shares this exact Mesh ID, channel and key.</p>
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 p-6"><button disabled={busy === "all"} onClick={removeAll} className="button-secondary w-full !text-rose-500">{busy === "all" ? "Removing…" : "Delete mesh everywhere"}</button></div>
    </aside></div>
  );
}

export function MeshInfoPanel() {
  return (
    <section>
      <p className="section-label">Before you join a mesh</p>
      <div className="grid gap-3">
        <div className="detail-card !border-dashed">
          <p className="font-medium text-slate-700">Driver support</p>
          <p className="mt-1 text-sm text-slate-500">The radio must support mesh point mode. On the device, <code>iw list</code> should list &quot;mesh point&quot; under Supported interface modes. Some drivers (e.g. ath10k-ct) advertise support but peer unreliably — swap in the non-ct kmod/firmware if links keep dropping.</p>
        </div>
        <div className="detail-card !border-dashed">
          <p className="font-medium text-slate-700">No spanning tree on the mesh</p>
          <p className="mt-1 text-sm text-slate-500">802.11s bridges straight onto the LAN with no STP protection. Combining a mesh backhaul with another non-mesh backhaul between the same two devices (a second wireless mesh, an unmanaged ethernet link) can create a bridge loop.</p>
        </div>
      </div>
    </section>
  );
}
