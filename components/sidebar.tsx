"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, LayoutDashboard, Network, Radio, Settings, Share2, Users } from "lucide-react";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/topology", label: "Topology", icon: Share2 },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return <aside className="app-sidebar">
    <div className="site-switcher"><span className="status-dot"/> <span>OpenFi Home</span><span className="switcher-chevron">⌄</span></div>
    <Link href="/" className="brand"><span className="brand-mark"><Radio size={18}/></span><span><strong>OpenFi</strong><small>NETWORK</small></span></Link>
    <nav className="primary-nav">{nav.map(({ href, label, icon: Icon }) => {
      const active = pathname === href;
      return <Link className={`nav-item ${active ? "nav-active" : ""}`} href={href} key={href} aria-current={active ? "page" : undefined}><Icon size={20}/><span>{label}</span></Link>;
    })}</nav>
    <div className="sidebar-bottom"><span className="nav-item"><Gauge size={20}/><span>System</span></span><span className="controller-version">OpenWrt · self-hosted</span></div>
  </aside>;
}
