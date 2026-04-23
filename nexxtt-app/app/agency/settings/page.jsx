import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { BrandSettingsForm } from "@/components/settings/BrandSettingsForm";
import { PasswordChangeCard } from "@/components/settings/PasswordChangeCard";
import { resolveAgencyContext } from "@/lib/impersonation";

export const metadata = {
  title: "Brand & Portal · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function SettingsPage() {
  const ctx = await resolveAgencyContext();
  if (!ctx.user) redirect("/login");

  if (!ctx.agencyId) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted text-sm">
          You need an agency account to manage brand settings.
        </p>
      </main>
    );
  }

  // Brand reads always go through admin client since agency_brands table RLS
  // only allows reads — no UPDATE policy exists.
  const admin = createAdminSupabaseClient();
  const { data: agency } = await admin
    .from("agencies")
    .select("id, name, slug")
    .eq("id", ctx.agencyId)
    .single();

  const { data: brand } = await admin
    .from("agency_brands")
    .select("display_name, logo_url, primary_colour, accent_colour, portal_slug, support_email, sign_off_name, default_invite_message, portal_domain")
    .eq("agency_id", ctx.agencyId)
    .maybeSingle();

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title="Brand & Portal" />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1200px] mx-auto w-full">
        {ctx.isImpersonating && (
          <div
            className="mb-4 rounded-[10px] px-3.5 py-2.5 text-[0.82rem]"
            style={{
              background: "rgba(124,58,237,0.08)",
              color: "#7c3aed",
              border: "1px solid rgba(124,58,237,0.25)",
            }}
          >
            ⚠️ You&apos;re viewing {ctx.agencyName}&apos;s brand settings. Saves
            are blocked during admin preview — your own agency doesn&apos;t
            have one, so changes here would fail anyway.
          </div>
        )}
        <p className="text-sm text-muted mb-5">
          Edit your agency&apos;s brand — changes appear on your clients&apos; portals
          within a minute.
        </p>
        <BrandSettingsForm agency={agency} brand={brand ?? {}} />

        <div className="mt-8">
          <h2 className="font-display text-[1.1rem] font-extrabold text-dark mb-3">
            Account
          </h2>
          <PasswordChangeCard email={ctx.user.email} />
        </div>
      </main>
    </>
  );
}
