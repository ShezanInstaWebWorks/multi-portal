import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { resolvePortalContext } from "@/lib/portal-context";
import { PortalTopbar } from "@/components/layout/PortalTopbar";
import { PasswordChangeCard } from "@/components/settings/PasswordChangeCard";

export const metadata = { title: "Account settings · Client portal", robots: "noindex, nofollow" };

export default async function ClientPortalSettingsPage({ params }) {
  const { agencySlug, clientSlug } = await params;
  const { user, brand, client } = await resolvePortalContext(agencySlug, clientSlug);

  if (!user) redirect("/login");
  if (!brand || !client) notFound();

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <PortalTopbar title="Account settings" />
      </Suspense>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[640px]">
        {/* Account info strip */}
        <div className="bg-white border border-border rounded-[16px] p-5 shadow-sm mb-5">
          <div
            className="text-[0.65rem] font-bold uppercase text-muted mb-3"
            style={{ letterSpacing: "0.1em" }}
          >
            Your account
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
              style={{
                background: brand.accent_colour ?? "#00B8A9",
                color: brand.primary_colour ?? "#0B1F3A",
              }}
            >
              {(client.contact_name ?? "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-dark text-sm">{client.contact_name}</div>
              <div className="text-[0.78rem] text-muted">{user.email}</div>
            </div>
          </div>
        </div>

        <PasswordChangeCard email={user.email} />
      </main>
    </>
  );
}
