"use client";
import { NotStandardOpenWrt } from "@/components/not-implemented";

export default function VpnSettingsPage() {
  return (
    <div className="mt-8 space-y-8">
      <p className="text-sm text-slate-500">VPN server profiles (site-to-site and remote-access) for adopted devices.</p>
      <NotStandardOpenWrt title="VPN servers (WireGuard / OpenVPN / IPsec)" description="Zit niet standaard in OpenWrt. Functionaliteit moet later ingebouwd worden." />
    </div>
  );
}
