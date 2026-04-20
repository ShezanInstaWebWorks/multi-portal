import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AgencyTopbar } from "@/components/layout/AgencyTopbar";
import { InviteWizard } from "@/components/clients/InviteWizard";

export const metadata = {
  title: "Invite Client · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function InviteClientPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("agency_id, first_name, last_name")
    .eq("id", user.id)
    .single();

  const { data: agency } = profile?.agency_id
    ? await supabase
        .from("agencies")
        .select("id, name, slug")
        .eq("id", profile.agency_id)
        .single()
    : { data: null };

  const { data: brand } = profile?.agency_id
    ? await supabase
        .from("agency_brands")
        .select("display_name, portal_slug, primary_colour, accent_colour, support_email, sign_off_name, default_invite_message")
        .eq("agency_id", profile.agency_id)
        .maybeSingle()
    : { data: null };

  return (
    <>
      <Suspense fallback={<div className="h-topbar bg-white border-b border-border" />}>
        <AgencyTopbar title="Invite Client" />
      </Suspense>
      <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-20 lg:pb-8 max-w-[1200px] mx-auto w-full">
        <InviteWizard
          agency={agency}
          brand={brand}
          profileName={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()}
        />
      </main>
    </>
  );
}
