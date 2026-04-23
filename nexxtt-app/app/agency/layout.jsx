import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AgencySidebar } from "@/components/layout/AgencySidebar";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { AgencyBottomNav } from "@/components/layout/AgencyBottomNav";
import { ImpersonationBanner } from "@/components/shared/ImpersonationBanner";
import { CommandPalette } from "@/components/search/CommandPalette";
import { resolveAgencyContext } from "@/lib/impersonation";
import { EmbedShell } from "@/components/layout/EmbedShell";

export default async function AgencyLayout({ children }) {
  const ctx = await resolveAgencyContext();

  // Brand-new agencies sit at status='pending' until an admin approves them.
  // Bounce them to the awaiting-approval landing instead of a broken dashboard.
  // Also covers the orphaned case where user_profiles.agency_id failed to wire
  // up on signup — without this guard the agency would land on /agency/* with
  // agencyId=null and bypass tenant filters on detail pages.
  // Admins-impersonating skip this check.
  if (
    ctx.user &&
    ctx.profile?.role === "agency" &&
    !ctx.isImpersonating &&
    (!ctx.agency || ctx.agency.status !== "active")
  ) {
    redirect("/signup/agency/pending");
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-off" />}>
      <EmbedShell
        shell={
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
            <CommandPalette />
          </div>
        }
      >
        <div className="min-h-screen bg-off flex flex-col">{children}</div>
      </EmbedShell>
    </Suspense>
  );
}
