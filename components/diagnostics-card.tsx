"use client";
import { FormEvent, useState } from "react";

export function DiagnosticsCard({ deviceId }: { deviceId: string }) {
  const [type, setType] = useState<"ping" | "traceroute" | "nslookup">("ping");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setRunning(true); setError(""); setOutput("");
    const target = String(new FormData(event.currentTarget).get("target") ?? "");
    const response = await fetch(`/api/routers/${deviceId}/diagnostics`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, target }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Diagnostic failed."); else setOutput(result.output || "(no output)");
    setRunning(false);
  }

  return (
    <section className="panel p-5">
      <p className="section-label">Diagnostics</p>
      <form onSubmit={run} className="flex flex-wrap items-end gap-3">
        <label className="min-w-[110px]">Tool<select className="select-field" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="ping">Ping</option><option value="traceroute">Traceroute</option><option value="nslookup">DNS Lookup</option>
        </select></label>
        <label className="min-w-[220px] flex-1">Target<input name="target" required placeholder="8.8.8.8 or example.com" /></label>
        <button disabled={running} className="button-primary">{running ? "Running…" : "Run"}</button>
      </form>
      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      {output && <pre className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-200">{output}</pre>}
    </section>
  );
}
