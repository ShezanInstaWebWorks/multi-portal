import { DirectSidebar } from "@/components/layout/DirectSidebar";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { DirectBottomNav } from "@/components/layout/DirectBottomNav";
import { CommandPalette } from "@/components/search/CommandPalette";

export default function DirectLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-off">
      <aside
        className="hidden lg:flex w-sidebar flex-col fixed inset-y-0 left-0 z-40"
        style={{ boxShadow: "4px 0 24px rgba(11,31,58,0.18)" }}
      >
        <DirectSidebar />
      </aside>
      <MobileDrawer>
        <DirectSidebar />
      </MobileDrawer>
      <div className="flex-1 flex flex-col lg:ml-sidebar">{children}</div>
      <DirectBottomNav />
      <CommandPalette />
    </div>
  );
}
