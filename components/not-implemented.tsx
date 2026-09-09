import { Construction } from "lucide-react";

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
