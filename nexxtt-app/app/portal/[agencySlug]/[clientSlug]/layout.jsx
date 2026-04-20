import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { ClientTopbar } from "@/components/client-portal/ClientTopbar";

// Don't long-cache — agencies change brand colours/logos and expect it live.
export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { agencySlug } = await params;
  const admin = createAdminSupabaseClient();
  const { data: brand } = await admin
    .from("agency_brands")
    .select("display_name")
    .eq("portal_slug", agencySlug)
    .maybeSingle();
  return {
    title: brand?.display_name ?? "Client Portal",
    robots: "noindex, nofollow",
  };
}

export default async function ClientPortalLayout({ children, params }) {
  const { agencySlug, clientSlug } = await params;
  const supabase = await createServerSupabaseClient();

  // Must be logged in to see a portal. Role check enforced by proxy.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use admin client to resolve brand + client (agency_brands is public-readable
  // already, but clients isn't — and we want a clean 404 rather than RLS silence).
  const admin = createAdminSupabaseClient();

  const { data: brand } = await admin
    .from("agency_brands")
    .select("agency_id, display_name, logo_url, primary_colour, accent_colour, portal_slug, support_email, sign_off_name")
    .eq("portal_slug", agencySlug)
    .maybeSingle();
  if (!brand) notFound();

  const { data: client } = await admin
    .from("clients")
    .select("id, business_name, contact_name, portal_slug, portal_user_id")
    .eq("agency_id", brand.agency_id)
    .eq("portal_slug", clientSlug)
    .maybeSingle();
  if (!client) notFound();

  // Authorization:
  //   - the client's own portal_user_id, OR
  //   - an agency member/admin for this agency (for preview / impersonation),
  //   - platform admin role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();

  const isClientOwner    = client.portal_user_id === user.id;
  const isAgencyOfRecord = profile?.role === "agency" && profile.agency_id === brand.agency_id;
  const isAdmin          = profile?.role === "admin";

  if (!isClientOwner && !isAgencyOfRecord && !isAdmin) {
    redirect("/login");
  }

  const userName =
    isClientOwner
      ? client.contact_name
      : `${profile?.role === "admin" ? "Admin Preview" : "Agency Preview"}`;

  const cssVars = `
    :root {
      --wl-primary: ${brand.primary_colour ?? "#0B1F3A"};
      --wl-accent:  ${brand.accent_colour  ?? "#00B8A9"};
    }
  `;

  return (
    <div className="flex min-h-screen flex-col bg-off">
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <ClientTopbar brand={brand} userName={userName} />
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
    </div>
  );
}
