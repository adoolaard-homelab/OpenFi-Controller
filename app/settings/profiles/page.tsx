"use client";
import { NextPhaseFeature } from "@/components/not-implemented";

export default function ProfilesSettingsPage() {
  return (
    <div className="mt-8 space-y-8">
      <p className="text-sm text-slate-500">Reusable port and switch profiles to apply consistent VLAN/PoE behavior across ports.</p>
      <NextPhaseFeature title="Port profiles" description="Herbruikbare poortprofielen (native/tagged VLANs, PoE-modus) vereisen de DSA switch-topologie subsysteem en volgen in een volgende fase." />
      <NextPhaseFeature title="Switch profiles" description="Profielen die op meerdere switches/APs tegelijk kunnen worden toegepast volgen in een volgende fase." />
    </div>
  );
}
