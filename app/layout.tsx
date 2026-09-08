import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
export const metadata: Metadata = { title: "OpenFi Controller", description: "Self-hosted OpenWrt network controller" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Sidebar/><main className="min-h-screen md:ml-64"><Topbar/>{children}</main></body></html>; }
