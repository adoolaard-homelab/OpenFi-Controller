"use client";
import { Bell, ChevronDown, CircleHelp, LogOut, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export function Topbar() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="topbar">
      <div className="health"><i/> All Network Health <ChevronDown size={14}/></div>
      <div className="top-actions">
        <button aria-label="Search"><Search size={18}/></button>
        <button aria-label="Help"><CircleHelp size={18}/></button>
        <button aria-label="Notifications" className="notification"><Bell size={18}/><b/></button>
        <button className="avatar" aria-label="Profile">OF</button>
        <button aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={18}/></button>
      </div>
    </header>
  );
}
