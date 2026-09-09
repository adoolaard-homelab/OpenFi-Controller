"use client";
import Link from "next/link";
import { Activity, Cable, ChartNoAxesCombined, LayoutDashboard, Network, Radio, Router, Settings, Users, Wifi } from "lucide-react";
import { usePathname } from "next/navigation";
const nav = [
 { href: "/", label: "Dashboard", icon: LayoutDashboard }, { href: "/topology", label: "Topology", icon: Network },
 { href: "/routers", label: "Devices", icon: Router }, { href: "/clients", label: "Client Devices", icon: Users },
 { href: "/ports", label: "Ports", icon: Cable }, { href: "/radios", label: "Radios", icon: Wifi }, { href: "/insights", label: "Insights", icon: ChartNoAxesCombined },
];
export function Sidebar() { const pathname=usePathname(); return <aside className="sidebar"><Link href="/" className="brand" aria-label="OpenFi home"><Radio size={22}/></Link><nav>{nav.map(({href,label,icon:Icon})=><Link title={label} className={`nav-icon ${pathname===href?"active":""}`} href={href} key={href}><Icon size={21}/><span>{label}</span></Link>)}</nav><Link title="Settings" className={`nav-icon settings ${pathname==="/settings"?"active":""}`} href="/settings"><Settings size={21}/><span>Settings</span></Link></aside> }
