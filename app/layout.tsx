import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
export const metadata: Metadata = { title: "OpenFi Network", description: "OpenWrt network controller" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Sidebar/><main><Topbar/>{children}</main></body></html>; }
