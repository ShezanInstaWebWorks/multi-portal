import { Suspense } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { CommandPalette } from "@/components/search/CommandPalette";
import { EmbedShell } from "@/components/layout/EmbedShell";

export default function AdminLayout({ children }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-off" />}>
      <EmbedShell
        shell={
          <div className="flex min-h-screen bg-off">
            <aside
              className="hidden lg:flex w-sidebar flex-col fixed inset-y-0 left-0 z-40"
              style={{ boxShadow: "4px 0 24px rgba(11,31,58,0.18)" }}
            >
              <AdminSidebar />
            </aside>
            <MobileDrawer>
              <AdminSidebar />
            </MobileDrawer>
            <div className="flex-1 flex flex-col lg:ml-sidebar">{children}</div>
            <CommandPalette />
          </div>
        }
      >
        <div className="min-h-screen bg-off flex flex-col">{children}</div>
      </EmbedShell>
    </Suspense>
  );
}
