import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "OpenFi Network",
  description: "OpenWrt network controller",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
