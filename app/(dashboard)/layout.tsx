import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Sidebar />
      <main>
        <Topbar />
        {children}
      </main>
    </>
  );
}
