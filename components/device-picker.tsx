"use client";
import Link from "next/link";
import { Router } from "lucide-react";
import { useEffect } from "react";
import { useRouters, type RouterSummary } from "@/lib/use-routers";

/** Per-device pages (Radios, Ports, Insights, per-device Settings) are scoped to one adopted OpenWrt device at a time. */
export function useDeviceScope(selected: string | undefined, setSelected: (id: string) => void) {
  const routers = useRouters();
  useEffect(() => { if (!selected && routers?.length) setSelected(routers[0].id); }, [routers, selected, setSelected]);
  return routers;
}

export function DevicePicker({ routers, value, onChange }: { routers: RouterSummary[]; value: string | undefined; onChange: (id: string) => void }) {
  return (
    <label className="w-full max-w-xs">
      <span className="section-label !mb-1.5">Device</span>
      <select className="select-field" value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        {routers.map((router) => <option key={router.id} value={router.id}>{router.name}</option>)}
      </select>
    </label>
  );
}

export function NoDevices() {
  return (
    <section className="panel grid place-items-center gap-3 p-14 text-center">
      <Router className="text-sky-400" />
      <div>
        <p className="font-medium">No OpenWrt devices adopted</p>
        <p className="mt-1 text-sm text-slate-500">Adopt a device before device-specific settings can be shown.</p>
      </div>
      <Link className="button-primary" href="/routers">Add OpenWrt Device</Link>
    </section>
  );
}
