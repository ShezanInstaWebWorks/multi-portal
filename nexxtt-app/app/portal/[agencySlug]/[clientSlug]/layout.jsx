import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { ClientTopbar } from "@/components/client-portal/ClientTopbar";
import { CommandPalette } from "@/components/search/CommandPalette";
import { resolvePortalContext } from "@/lib/portal-context";
import { EmbedShell } from "@/components/layout/EmbedShell";
import { ClientMobileDrawer } from "@/components/layout/ClientMobileDrawer";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { ClientSidebarContent } from "./ClientSidebarContent";
import { MobileAppBar } from "./MobileAppBar";

// Don't long-cache — agencies change brand colours/logos and expect it live.
export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { agencySlug, clientSlug } = await params;
  const { brand } = await resolvePortalContext(agencySlug, clientSlug);
  return {
    title: brand?.display_name ?? "Client Portal",
    robots: "noindex, nofollow",
  };
}

export default async function ClientPortalLayout({ children, params }) {
  const { agencySlug, clientSlug } = await params;
  const { user, brand, client, profile } = await resolvePortalContext(agencySlug, clientSlug);

  if (!user) redirect("/login");
  if (!brand || !client) notFound();

  const isClientOwner    = client.portal_user_id === user.id;
  const isAgencyOfRecord = profile?.role === "agency" && profile.agency_id === brand.agency_id;
  const isAdmin          = profile?.role === "admin";

  if (!isClientOwner && !isAgencyOfRecord && !isAdmin) {
    redirect("/login");
  }

  const userName = isClientOwner
    ? client.contact_name
    : profile?.role === "admin" ? "Admin Preview" : "Agency Preview";

  const firstName = (userName ?? "").split(/\s+/)[0] || "User";

  const cssVars = `
    :root {
      --wl-primary: ${brand.primary_colour ?? "#0B1F3A"};
      --wl-accent:  ${brand.accent_colour  ?? "#00B8A9"};
    }
  `;

  return (
    <Suspense fallback={<div className="min-h-screen bg-off" />}>
      <EmbedShell
        sidebar={
          <>
            <aside
              className="hidden lg:flex w-sidebar flex-col fixed inset-y-0 left-0 z-40"
              style={{ boxShadow: "4px 0 24px rgba(11,31,58,0.18)" }}
            >
              <ClientSidebarContent
                brand={brand}
                userName={userName}
                firstName={firstName}
                agencySlug={agencySlug}
                clientSlug={clientSlug}
                userId={user.id}
              />
            </aside>
            <ClientMobileDrawer>
              <ClientSidebarContent
                brand={brand}
                userName={userName}
                firstName={firstName}
                agencySlug={agencySlug}
                clientSlug={clientSlug}
                userId={user.id}
                mobile
              />
            </ClientMobileDrawer>
          </>
        }
        topbar={
          <MobileAppBar
            brand={brand}
            userId={user.id}
            userName={userName}
          />
        }
        preview={
          (isAgencyOfRecord || isAdmin) && !isClientOwner ? (
            <div
              className="text-center text-[0.72rem] font-semibold py-1.5"
              style={{
                background: "rgba(245,158,11,0.12)",
                color: "var(--color-amber)",
                borderBottom: "1px solid rgba(245,158,11,0.25)",
              }}
            >
              👁 {isAdmin ? "Admin preview" : "Agency preview"} — you&apos;re seeing the client&apos;s view
            </div>
          ) : null
        }
        overlays={<CommandPalette />}
      >
        {children}
      </EmbedShell>
    </Suspense>
  );
}
