"use client";
import { FormEvent, useState } from "react";
import type { Band } from "@/components/wifi-settings";

type Radio = { section: string; band: Band; channel: string; htmode: string; txpower?: number; disabled: boolean; up?: boolean; availableChannels: { channel: number; restricted: boolean }[] };
const WIDTHS: Record<Band, { value: string; label: string }[]> = {
  "2.4GHz": [{ value: "HT20", label: "20 MHz" }, { value: "HT40", label: "40 MHz" }],
  "5GHz": [{ value: "VHT20", label: "20 MHz" }, { value: "VHT40", label: "40 MHz" }, { value: "VHT80", label: "80 MHz" }, { value: "VHT160", label: "160 MHz" }],
};

export function RadioCard({ deviceId, radio, onSaved }: { deviceId: string; radio: Radio; onSaved: () => void }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    const form = new FormData(event.currentTarget);
    const values = { channel: String(form.get("channel")), htmode: String(form.get("htmode")), txpower: String(form.get("txpower")), disabled: form.get("disabled") === "on" ? "0" : "1" };
    const response = await fetch(`/api/routers/${deviceId}/wifi`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ section: radio.section, values }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Could not save radio settings."); else { setSaved(true); onSaved(); }
    setSaving(false);
  }

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between"><p className="section-label !mb-0">{radio.band} Radio <span className="ml-1 text-slate-400">({radio.section})</span></p>
        <span className={`status-pill ${radio.up ? "" : "!bg-slate-100 !text-slate-400"}`}><i className={radio.up ? "" : "!bg-slate-400"} />{radio.up ? "Up" : "Down"}</span>
      </div>
      <form onSubmit={submit} className="mt-4 grid max-w-md gap-4">
        <label className="flex items-center gap-2 !text-slate-700"><input name="disabled" type="checkbox" defaultChecked={!radio.disabled} className="!mt-0 w-auto" />Radio enabled</label>
        <div className="grid grid-cols-2 gap-4">
          <label>Channel<select name="channel" className="select-field" defaultValue={radio.channel}>
            <option value="auto">Auto</option>
            {radio.availableChannels.filter((c) => !c.restricted).map((c) => <option key={c.channel} value={c.channel}>{c.channel}</option>)}
          </select></label>
          <label>Channel width<select name="htmode" className="select-field" defaultValue={radio.htmode || WIDTHS[radio.band][0].value}>
            {WIDTHS[radio.band].map((width) => <option key={width.value} value={width.value}>{width.label}</option>)}
          </select></label>
        </div>
        <label>TX power (dBm)<input name="txpower" type="number" min={0} max={30} defaultValue={radio.txpower ?? 20} /></label>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        {saved && <p className="text-sm text-emerald-500">Saved and applied.</p>}
        <button disabled={saving} className="button-primary w-fit">{saving ? "Saving…" : "Save changes"}</button>
      </form>
    </section>
  );
}
