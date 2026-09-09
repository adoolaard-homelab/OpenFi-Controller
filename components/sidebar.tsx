"use client";
import Link from "next/link";
import { Activity, Cable, ChartNoAxesCombined, LayoutDashboard, Menu, Network, Radio, Router, Settings, Users, Waypoints, Wifi, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/topology", label: "Topology", icon: Network },
  { href: "/routers", label: "Devices", icon: Router },
  { href: "/clients", label: "Client Devices", icon: Users },
  { href: "/ports", label: "Ports", icon: Cable },
  { href: "/radios", label: "Radios", icon: Wifi },
  { href: "/mesh", label: "Mesh", icon: Waypoints },
  { href: "/insights", label: "Insights", icon: ChartNoAxesCombined },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <button
        className="mobile-menu-btn"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link href="/" className="brand" aria-label="OpenFi home"><Radio size={22} /></Link>
        <nav>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link title={label} aria-label={label} className={`nav-icon ${pathname === href ? "active" : ""}`} href={href} key={href}>
              <Icon size={21} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <Link title="Settings" aria-label="Settings" className={`nav-icon settings ${pathname.startsWith("/settings") ? "active" : ""}`} href="/settings">
          <Settings size={21} /><span>Settings</span>
        </Link>
      </aside>
    </>
  );
}
