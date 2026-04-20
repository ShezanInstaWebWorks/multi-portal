import { AgencySidebar } from "@/components/layout/AgencySidebar";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { AgencyBottomNav } from "@/components/layout/AgencyBottomNav";
import { ImpersonationBanner } from "@/components/shared/ImpersonationBanner";
import { resolveAgencyContext } from "@/lib/impersonation";

export default async function AgencyLayout({ children }) {
  const ctx = await resolveAgencyContext();

  return (
    <div className="flex min-h-screen bg-off">
      <aside
        className="hidden lg:flex w-sidebar flex-col fixed inset-y-0 left-0 z-40"
        style={{ boxShadow: "4px 0 24px rgba(11,31,58,0.18)" }}
      >
        <AgencySidebar />
      </aside>
      <MobileDrawer>
        <AgencySidebar />
      </MobileDrawer>
      <div className="flex-1 flex flex-col lg:ml-sidebar">
        {ctx.isImpersonating && <ImpersonationBanner agencyName={ctx.agencyName} />}
        {children}
      </div>
      <AgencyBottomNav />
    </div>
  );
}
