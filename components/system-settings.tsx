"use client";
import { Power, RotateCcw, Search, Skull, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

const ZONES = [
  { zonename: "Coordinated Universal Time", timezone: "UTC" },
  { zonename: "Europe/Amsterdam", timezone: "CET-1CEST,M3.5.0,M10.5.0/3" },
  { zonename: "Europe/London", timezone: "GMT0BST,M3.5.0/1,M10.5.0" },
  { zonename: "Europe/Berlin", timezone: "CET-1CEST,M3.5.0,M10.5.0/3" },
  { zonename: "Europe/Paris", timezone: "CET-1CEST,M3.5.0,M10.5.0/3" },
  { zonename: "Europe/Madrid", timezone: "CET-1CEST,M3.5.0,M10.5.0/3" },
  { zonename: "America/New_York", timezone: "EST5EDT,M3.2.0,M11.1.0" },
  { zonename: "America/Chicago", timezone: "CST6CDT,M3.2.0,M11.1.0" },
  { zonename: "America/Los_Angeles", timezone: "PST8PDT,M3.2.0,M11.1.0" },
  { zonename: "Asia/Tokyo", timezone: "JST-9" },
  { zonename: "Asia/Shanghai", timezone: "CST-8" },
  { zonename: "Australia/Sydney", timezone: "AEST-10AEDT,M10.1.0,M4.1.0/3" },
];

function SaveNote({ error, saved }: { error: string; saved: boolean }) {
  return <>{error && <p className="text-sm text-rose-400">{error}</p>}{saved && <p className="text-sm text-emerald-500">Saved and applied.</p>}</>;
}

export function SystemCard({ deviceId }: { deviceId: string }) {
  const [data, setData] = useState<{ hostname: string; zonename: string; ntp: { enabled: boolean; servers: string[] } }>();
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  useEffect(() => { setData(undefined); void fetch(`/api/routers/${deviceId}/system`).then((r) => r.json()).then(setData); }, [deviceId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    const form = new FormData(event.currentTarget);
    const zone = ZONES.find((z) => z.zonename === form.get("zonename")) ?? ZONES[0];
    const body = {
      hostname: String(form.get("hostname")), zonename: zone.zonename, timezone: zone.timezone,
      ntpEnabled: form.get("ntpEnabled") === "on", ntpServers: String(form.get("ntpServers") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    };
    const response = await fetch(`/api/routers/${deviceId}/system`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Could not save system settings."); else setSaved(true);
    setSaving(false);
  }

  return (
    <section className="panel p-5">
      <p className="section-label">System</p>
      {!data ? <p className="text-sm text-slate-500">Loading…</p> : (
        <form onSubmit={submit} className="grid max-w-md gap-4">
          <label>Hostname<input name="hostname" defaultValue={data.hostname} required /></label>
          <label>Timezone<select name="zonename" className="select-field" defaultValue={ZONES.find((z) => z.zonename === data.zonename)?.zonename ?? ZONES[0].zonename}>
            {ZONES.map((zone) => <option key={zone.zonename} value={zone.zonename}>{zone.zonename}</option>)}
          </select></label>
          <label className="flex items-center gap-2 !text-slate-700"><input name="ntpEnabled" type="checkbox" defaultChecked={data.ntp.enabled} className="!mt-0 w-auto" />Sync system time via NTP</label>
          <label>NTP servers (comma separated)<input name="ntpServers" defaultValue={data.ntp.servers.join(", ")} placeholder="0.openwrt.pool.ntp.org" /></label>
          <SaveNote error={error} saved={saved} />
          <button disabled={saving} className="button-primary w-fit">{saving ? "Saving…" : "Save changes"}</button>
        </form>
      )}
    </section>
  );
}

export function AdministrationCard({ deviceId }: { deviceId: string }) {
  const [ssh, setSsh] = useState<{ enabled: boolean; port: number; passwordAuth: boolean; rootPasswordAuth: boolean; lanOnly: boolean }>();
  const [pwSaving, setPwSaving] = useState(false); const [pwError, setPwError] = useState(""); const [pwSaved, setPwSaved] = useState(false);
  const [sshSaving, setSshSaving] = useState(false); const [sshError, setSshError] = useState(""); const [sshSaved, setSshSaved] = useState(false);
  useEffect(() => { setSsh(undefined); void fetch(`/api/routers/${deviceId}/system/ssh`).then((r) => r.json()).then(setSsh); }, [deviceId]);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPwSaving(true); setPwError(""); setPwSaved(false);
    const form = event.currentTarget; const data = new FormData(form);
    const password = String(data.get("password") ?? ""), confirm = String(data.get("confirm") ?? "");
    if (password !== confirm) { setPwError("Passwords do not match."); setPwSaving(false); return; }
    const response = await fetch(`/api/routers/${deviceId}/system/password`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setPwError(result.error ?? "Could not change password."); else { setPwSaved(true); form.reset(); }
    setPwSaving(false);
  }

  async function submitSsh(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSshSaving(true); setSshError(""); setSshSaved(false);
    const form = new FormData(event.currentTarget);
    const body = { enabled: form.get("enabled") === "on", port: Number(form.get("port")), passwordAuth: form.get("passwordAuth") === "on", rootPasswordAuth: form.get("rootPasswordAuth") === "on", lanOnly: form.get("lanOnly") === "on" };
    const response = await fetch(`/api/routers/${deviceId}/system/ssh`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setSshError(result.error ?? "Could not save SSH settings."); else { setSshSaved(true); setSsh((prev) => ({ ...prev!, ...body })); }
    setSshSaving(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="panel p-5">
        <p className="section-label">Root Password</p>
        <form onSubmit={submitPassword} className="grid gap-4">
          <label>New password<input name="password" type="password" minLength={8} required /></label>
          <label>Confirm password<input name="confirm" type="password" minLength={8} required /></label>
          <SaveNote error={pwError} saved={pwSaved} />
          <button disabled={pwSaving} className="button-primary w-fit">{pwSaving ? "Saving…" : "Change password"}</button>
        </form>
      </section>
      <section className="panel p-5">
        <p className="section-label">SSH Access</p>
        {!ssh ? <p className="text-sm text-slate-500">Loading…</p> : (
          <form onSubmit={submitSsh} className="grid gap-3">
            <label className="flex items-center gap-2 !text-slate-700"><input name="enabled" type="checkbox" defaultChecked={ssh.enabled} className="!mt-0 w-auto" />Enable SSH (dropbear)</label>
            <label>Port<input name="port" type="number" defaultValue={ssh.port} min={1} max={65535} /></label>
            <label className="flex items-center gap-2 !text-slate-700"><input name="passwordAuth" type="checkbox" defaultChecked={ssh.passwordAuth} className="!mt-0 w-auto" />Allow password authentication</label>
            <label className="flex items-center gap-2 !text-slate-700"><input name="rootPasswordAuth" type="checkbox" defaultChecked={ssh.rootPasswordAuth} className="!mt-0 w-auto" />Allow root password login</label>
            <label className="flex items-center gap-2 !text-slate-700"><input name="lanOnly" type="checkbox" defaultChecked={ssh.lanOnly} className="!mt-0 w-auto" />Restrict to LAN interface only</label>
            <SaveNote error={sshError} saved={sshSaved} />
            <button disabled={sshSaving} className="button-primary w-fit">{sshSaving ? "Saving…" : "Save changes"}</button>
          </form>
        )}
      </section>
    </div>
  );
}

export function RebootCard({ deviceId }: { deviceId: string }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function reboot() {
    if (!confirm("Reboot this device now? It will be unreachable for about a minute.")) return;
    setBusy(true); setMessage("");
    const response = await fetch(`/api/routers/${deviceId}/system/reboot`, { method: "POST" });
    setMessage(response.ok ? "Reboot triggered." : "Could not trigger reboot.");
    setBusy(false);
  }
  return (
    <section className="panel p-5">
      <p className="section-label">Maintenance</p>
      <p className="text-sm text-slate-500">Restart this device. Adopted clients will briefly lose connectivity.</p>
      <button disabled={busy} onClick={reboot} className="button-secondary mt-4 !text-rose-500"><Power size={15} /> {busy ? "Rebooting…" : "Reboot device"}</button>
      {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
    </section>
  );
}

export function LogsCard({ deviceId }: { deviceId: string }) {
  const [source, setSource] = useState<"system" | "kernel">("system");
  const [lines, setLines] = useState<string[]>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const refresh = useCallback(() => fetch(`/api/routers/${deviceId}/system/logs?source=${source}&lines=300`).then((r) => r.json()).then((data) => setLines(data.lines ?? [])), [deviceId, source]);
  useEffect(() => { setLines(undefined); void refresh(); }, [refresh]);
  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [lines]);
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <p className="section-label !mb-0">System Logs</p>
        <div className="flex items-center gap-3">
          <div className="segmented">{(["system", "kernel"] as const).map((name) => <button key={name} onClick={() => setSource(name)} className={source === name ? "active" : ""}>{name === "system" ? "syslog" : "dmesg"}</button>)}</div>
          <button className="button-secondary !px-3 !py-1.5 text-xs" onClick={refresh}>Refresh</button>
        </div>
      </div>
      <pre className="h-72 overflow-y-auto bg-slate-900 p-4 text-xs leading-relaxed text-slate-200">
        {!lines ? "Loading…" : lines.length ? lines.join("\n") : "No log lines reported."}
        <div ref={bottomRef} />
      </pre>
    </section>
  );
}

export function ProcessesCard({ deviceId }: { deviceId: string }) {
  const [processes, setProcesses] = useState<{ pid: string; user: string; vsz: string; stat: string; command: string }[]>();
  const [killing, setKilling] = useState("");
  const refresh = useCallback(() => fetch(`/api/routers/${deviceId}/system/processes`).then((r) => r.json()).then((data) => setProcesses(data.processes ?? [])), [deviceId]);
  useEffect(() => { setProcesses(undefined); void refresh(); }, [refresh]);
  async function kill(pid: string) {
    if (!confirm(`Kill process ${pid}?`)) return;
    setKilling(pid); await fetch(`/api/routers/${deviceId}/system/processes?pid=${pid}`, { method: "DELETE" }); setKilling(""); void refresh();
  }
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 p-5"><p className="section-label !mb-0">Processes</p><button className="button-secondary !px-3 !py-1.5 text-xs" onClick={refresh}><RotateCcw size={13} /> Refresh</button></div>
      <div className="max-h-96 overflow-y-auto"><table className="client-table"><thead><tr><th>PID</th><th>User</th><th>Mem (KB)</th><th>State</th><th>Command</th><th></th></tr></thead>
        <tbody>{processes?.map((process) => (
          <tr key={process.pid} className="!cursor-default"><td>{process.pid}</td><td>{process.user}</td><td>{process.vsz}</td><td>{process.stat}</td><td className="max-w-xs truncate">{process.command}</td>
            <td><button disabled={killing === process.pid} aria-label={`Kill process ${process.pid}`} onClick={() => kill(process.pid)} className="text-slate-500 hover:text-rose-400"><Skull size={15} /></button></td></tr>
        ))}</tbody>
      </table>{!processes && <p className="p-8 text-center text-sm text-slate-500">Loading…</p>}</div>
    </section>
  );
}

export function OpkgCard({ deviceId }: { deviceId: string }) {
  const [query, setQuery] = useState("");
  const [packages, setPackages] = useState<{ name: string; version: string; description: string }[]>();
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  const refresh = useCallback((q = "") => fetch(`/api/routers/${deviceId}/opkg${q ? `?q=${encodeURIComponent(q)}` : ""}`).then((r) => r.json()).then((data) => { setPackages(data.packages ?? []); setSearched(data.searched); }), [deviceId]);
  useEffect(() => { setPackages(undefined); void refresh(); }, [refresh]);

  async function install(pkg: string) {
    setBusy(pkg); setError("");
    const response = await fetch(`/api/routers/${deviceId}/opkg`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pkg }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Install failed.");
    setBusy(""); void refresh(query);
  }
  async function remove(pkg: string) {
    setBusy(pkg); setError("");
    const response = await fetch(`/api/routers/${deviceId}/opkg?pkg=${encodeURIComponent(pkg)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Remove failed.");
    setBusy(""); void refresh(query);
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <p className="section-label !mb-0">Software (opkg)</p>
        <form onSubmit={(e) => { e.preventDefault(); void refresh(query); }} className="search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search available packages" /></form>
      </div>
      <div className="max-h-96 overflow-y-auto"><table className="client-table"><thead><tr><th>Package</th><th>Version</th><th>Description</th><th></th></tr></thead>
        <tbody>{packages?.map((pkg) => (
          <tr key={pkg.name} className="!cursor-default"><td>{pkg.name}</td><td>{pkg.version}</td><td className="max-w-md truncate">{pkg.description}</td>
            <td>{searched
              ? <button disabled={busy === pkg.name} onClick={() => install(pkg.name)} className="button-secondary !px-3 !py-1.5 text-xs">{busy === pkg.name ? "Installing…" : "Install"}</button>
              : <button disabled={busy === pkg.name} aria-label={`Remove ${pkg.name}`} onClick={() => remove(pkg.name)} className="text-slate-500 hover:text-rose-400"><Trash2 size={15} /></button>}</td></tr>
        ))}</tbody>
      </table>
        {!packages ? <p className="p-8 text-center text-sm text-slate-500">Loading…</p> : !packages.length && <p className="p-8 text-center text-sm text-slate-500">{searched ? "No packages matched your search." : "No packages reported as installed."}</p>}
      </div>
      {error && <p className="border-t border-slate-200 p-4 text-sm text-rose-400">{error}</p>}
    </section>
  );
}
