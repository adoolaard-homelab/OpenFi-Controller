"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/settings/system", label: "System" },
  { href: "/settings/networks", label: "Networks" },
  { href: "/settings/wifi", label: "WiFi" },
  { href: "/settings/dhcp-dns", label: "DHCP & DNS" },
  { href: "/settings/firewall", label: "Firewall" },
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
