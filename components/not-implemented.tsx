import { Construction, PlugZap, Sparkles } from "lucide-react";

export function NotImplemented({ title, description }: { title: string; description?: string }) {
  return (
    <div className="detail-card flex items-start gap-3 !border-dashed">
      <Construction size={18} className="mt-0.5 shrink-0 text-amber-400" />
      <div>
        <p className="flex items-center gap-2 font-medium text-slate-700">{title}<span className="pill">Not implemented yet</span></p>
        <p className="mt-1 text-sm text-slate-500">{description ?? "This function has not been built yet. It will read and write real data from the adopted OpenWrt device once implemented."}</p>
      </div>
    </div>
  );
}

export function NotImplementedSection({ title, items }: { title: string; items: { title: string; description?: string }[] }) {
  return (
    <section>
      <p className="section-label">{title}</p>
      <div className="grid gap-3">
        {items.map((item) => <NotImplemented key={item.title} title={item.title} description={item.description} />)}
      </div>
    </section>
  );
}

/** For functionality that isn't a standard part of stock OpenWrt (advanced VPN servers, DPI/traffic inspection,
 * automatic AI channel optimization, ...). Uses the exact phrasing agreed for these pages. */
export function NotStandardOpenWrt({ title, description }: { title: string; description?: string }) {
  return (
    <div className="detail-card flex items-start gap-3 !border-dashed !bg-amber-50/40">
      <PlugZap size={18} className="mt-0.5 shrink-0 text-amber-500" />
      <div>
        <p className="flex items-center gap-2 font-medium text-slate-700">{title}<span className="pill">Not standard in OpenWrt</span></p>
        <p className="mt-1 text-sm text-slate-500">{description ?? "Zit niet standaard in OpenWrt. Functionaliteit moet later ingebouwd worden."}</p>
      </div>
    </div>
  );
}

/** For large OpenWrt subsystems (zone-based firewalls, multi-VLAN trunking, attended sysupgrade, switch/port
 * profiles, ...) whose UI is already built out UniFi-style but whose ubus backend ships in a later phase. */
export function NextPhaseFeature({ title, description }: { title: string; description?: string }) {
  return (
    <div className="detail-card flex items-start gap-3 !border-dashed !bg-sky-50/40">
      <Sparkles size={18} className="mt-0.5 shrink-0 text-sky-500" />
      <div>
        <p className="flex items-center gap-2 font-medium text-slate-700">{title}<span className="pill !border-sky-200 !bg-sky-50 !text-sky-700">Next phase</span></p>
        <p className="mt-1 text-sm text-slate-500">{description ?? "UI is ready. The ubus backend for this subsystem is rolled out in a later phase."}</p>
      </div>
    </div>
  );
}

export function NextPhaseSection({ title, items }: { title: string; items: { title: string; description?: string }[] }) {
  return (
    <section>
      <p className="section-label">{title}</p>
      <div className="grid gap-3">
        {items.map((item) => <NextPhaseFeature key={item.title} title={item.title} description={item.description} />)}
      </div>
    </section>
  );
}
