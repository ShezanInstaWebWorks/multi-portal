import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Signing in… · nexxtt.io", robots: "noindex, nofollow" };

// Server-side fallback router. Any successful sign-in that doesn't have a
// specific post-login destination (e.g. invited client clicking the email CTA
// with `?next=`) lands here so we can resolve the right home from session state
// and redirect — including agency_client, whose home depends on their agency +
// client slugs.
export default async function PostLoginPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? user.user_metadata?.role ?? null;

  switch (role) {
    case "admin":
      redirect("/admin");
    case "agency":
      redirect("/agency/dashboard");
    case "referral_partner":
      redirect("/referral/dashboard");
    case "direct_client":
      redirect("/direct/dashboard");
    case "agency_client": {
      // Resolve this user's client row + the owning agency's portal slug.
      const { data: client } = await admin
        .from("clients")
        .select("portal_slug, agency_id")
        .eq("portal_user_id", user.id)
        .maybeSingle();
      if (!client?.agency_id || !client.portal_slug) redirect("/login");

      const { data: brand } = await admin
        .from("agency_brands")
        .select("portal_slug")
        .eq("agency_id", client.agency_id)
        .maybeSingle();
      const { data: agency } = await admin
        .from("agencies")
        .select("slug")
        .eq("id", client.agency_id)
        .maybeSingle();

      const agencySlug = brand?.portal_slug ?? agency?.slug;
      if (!agencySlug) redirect("/login");
      redirect(`/portal/${agencySlug}/${client.portal_slug}`);
    }
    default:
      redirect("/login");
  }
}
