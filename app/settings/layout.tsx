"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/settings/wifi", label: "WiFi" },
  { href: "/settings/networks", label: "Networks" },
  { href: "/settings/internet", label: "Internet" },
  { href: "/settings/vpn", label: "VPN" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/routing", label: "Routing" },
  { href: "/settings/profiles", label: "Profiles" },
  { href: "/settings/system", label: "System" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="page">
      <p className="eyebrow">Controller</p>
      <h1 className="page-title">Settings</h1>
      <p className="subtitle">Configure every adopted OpenWrt device without leaving OpenFi.</p>
      <nav className="subnav mt-8">
        {sections.map((section) => <Link key={section.href} href={section.href} className={pathname === section.href ? "active" : ""}>{section.label}</Link>)}
      </nav>
      {children}
    </div>
  );
}
