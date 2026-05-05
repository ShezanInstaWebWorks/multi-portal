import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AgencySidebar } from "@/components/layout/AgencySidebar";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { AgencyBottomNav } from "@/components/layout/AgencyBottomNav";
import { ImpersonationBanner } from "@/components/shared/ImpersonationBanner";
import { CommandPalette } from "@/components/search/CommandPalette";
import { resolveAgencyContext } from "@/lib/impersonation";
import { EmbedShell } from "@/components/layout/EmbedShell";

function initials(str = "") {
  return str
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export default async function AgencyLayout({ children }) {
  const ctx = await resolveAgencyContext();

  if (
    ctx.user &&
    ctx.profile?.role === "agency" &&
    !ctx.isImpersonating &&
    (!ctx.agency || ctx.agency.status !== "active")
  ) {
    redirect("/signup/agency/pending");
  }

  // Count active (non-delivered/non-cancelled) orders for the sidebar badge.
  let ordersCount = null;
  if (ctx.agencyId) {
    const { count } = await ctx.supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", ctx.agencyId);
    ordersCount = count ?? 0;
  }

  // Build display values from real context.
  const agencyName    = ctx.agencyName ?? ctx.agency?.name ?? "Your Agency";
  const agencyInit    = initials(agencyName);
  const firstName     = ctx.profile?.first_name ?? "";
  const lastName      = ctx.profile?.last_name  ?? "";
  const userName      = [firstName, lastName].filter(Boolean).join(" ") || ctx.user?.email?.split("@")[0] || "";
  const userInit      = initials(userName || agencyName);
  const userRole      = ctx.profile?.role ?? "agency";

  const sidebarProps = { agencyName, agencyInitials: agencyInit, userName, userInitials: userInit, userRole, ordersCount };

  return (
    <Suspense fallback={<div className="min-h-screen bg-off" />}>
      <EmbedShell
        sidebar={
          <>
            <aside
              className="hidden lg:flex w-sidebar flex-col fixed inset-y-0 left-0 z-40"
              style={{ boxShadow: "4px 0 24px rgba(11,31,58,0.18)" }}
            >
              <AgencySidebar {...sidebarProps} />
            </aside>
            <MobileDrawer>
              <AgencySidebar {...sidebarProps} />
            </MobileDrawer>
          </>
        }
        preview={ctx.isImpersonating && <ImpersonationBanner agencyName={ctx.agencyName} />}
        footer={<AgencyBottomNav />}
        overlays={<CommandPalette />}
      >
        {children}
      </EmbedShell>
    </Suspense>
  );
}
