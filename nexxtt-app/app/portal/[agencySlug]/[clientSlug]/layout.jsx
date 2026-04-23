import Link from "next/link";
import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { ClientTopbar } from "@/components/client-portal/ClientTopbar";
import { CommandPalette } from "@/components/search/CommandPalette";
import { resolvePortalContext } from "@/lib/portal-context";
import { EmbedShell } from "@/components/layout/EmbedShell";

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

  const cssVars = `
    :root {
      --wl-primary: ${brand.primary_colour ?? "#0B1F3A"};
      --wl-accent:  ${brand.accent_colour  ?? "#00B8A9"};
    }
  `;

  return (
    <Suspense fallback={<div className="min-h-screen bg-off" />}>
      <EmbedShell
        shell={
          <div className="flex min-h-screen flex-col bg-off">
            <style dangerouslySetInnerHTML={{ __html: cssVars }} />
            <ClientTopbar brand={brand} userName={userName} />
            <nav
              className="bg-white border-b border-border px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto"
              style={{ boxShadow: "0 1px 0 var(--color-border)" }}
            >
              <PortalNavLink href={`/portal/${agencySlug}/${clientSlug}`}           label="Dashboard" />
              <PortalNavLink href={`/portal/${agencySlug}/${clientSlug}/requests`}  label="Requests" />
            </nav>
            {(isAgencyOfRecord || isAdmin) && !isClientOwner && (
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
            )}
            {children}
            <CommandPalette />
          </div>
        }
      >
        <div className="min-h-screen bg-off flex flex-col">
          <style dangerouslySetInnerHTML={{ __html: cssVars }} />
          {children}
        </div>
      </EmbedShell>
    </Suspense>
  );
}

function PortalNavLink({ href, label }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center px-3 py-2.5 text-[0.85rem] font-semibold text-muted hover:text-dark border-b-2 border-transparent hover:border-[var(--wl-accent)] whitespace-nowrap"
    >
      {label}
    </Link>
  );
}
