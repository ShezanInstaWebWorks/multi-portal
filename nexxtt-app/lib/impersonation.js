import { cookies } from "next/headers";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

export const IMPERSONATE_AGENCY_COOKIE = "nx_impersonate_agency";
export const IMPERSONATE_EXPIRY_SECONDS = 60 * 60; // 1 hour, matches MD §37

/**
 * Resolves the "effective" agency context for an agency-scoped server page.
 *
 * Behaviour:
 *  - If the current user is `admin` AND the `nx_impersonate_agency` cookie
 *    is set, return that agency's id with `isImpersonating: true`.
 *    Pages should use the returned service-role `supabase` client for reads so
 *    RLS (which gates by the admin's own uid) doesn't strip everything.
 *  - Otherwise, return the user's own agency_id from `user_profiles`.
 *  - If neither applies, returns `{ agencyId: null }` so the caller can
 *    redirect or show an empty state.
 */
export async function resolveAgencyContext() {
  const userClient = await createServerSupabaseClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { user: null, agencyId: null, isImpersonating: false, supabase: userClient };

  const cookieStore = await cookies();
  const impersonatedId = cookieStore.get(IMPERSONATE_AGENCY_COOKIE)?.value ?? null;

  const { data: profile } = await userClient
    .from("user_profiles")
    .select("agency_id, role, first_name, last_name")
    .eq("id", user.id)
    .single();

  // Admin impersonating a specific agency
  if (impersonatedId && profile?.role === "admin") {
    const admin = createAdminSupabaseClient();
    const { data: impersonated } = await admin
      .from("agencies")
      .select("id, name")
      .eq("id", impersonatedId)
      .maybeSingle();
    if (impersonated) {
      return {
        user,
        profile,
        agencyId: impersonated.id,
        agencyName: impersonated.name,
        isImpersonating: true,
        supabase: admin,
      };
    }
  }

  return {
    user,
    profile,
    agencyId: profile?.agency_id ?? null,
    agencyName: null,
    isImpersonating: false,
    supabase: userClient,
  };
}

/**
 * Client portal impersonation — same idea but keyed on the portal slugs in
 * the URL. Admin doesn't need a cookie here because the layout already
 * accepts any agency/admin user and shows a preview banner (session 9).
 * This helper just centralises "is the current viewer NOT the owning client?"
 */
export async function readImpersonationBannerInfo() {
  const cookieStore = await cookies();
  return {
    impersonatedAgencyId: cookieStore.get(IMPERSONATE_AGENCY_COOKIE)?.value ?? null,
  };
}
